import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { assign, compact, every, flatten, groupBy, identity, isNil, isNull, isString, map, some, uniq } from 'lodash';

import { FormControlWithWarning } from './form-control-with-warning';
import { FormGroupFacade, IOuterFormPropName } from './form-group-facade';
import { CUSTOM_VALIDATOR_SYMBOL, IConditionalRequiredPropertyInfo, ValueOrFn } from './form-group-facade.interfaces';
import { getValue, isNullUndefinedEmpty } from './helpers';

type Dependents<I> = keyof I | symbol | IOuterFormPropName<any, any>;

// @dynamic
export class FormFacadeValidators
{
  static conditionalValidation(predicate: () => boolean, validatorFn: ValidatorFn): ValidatorFn
  {
    const dependents = FormFacadeValidators.getDependents([validatorFn]);
    const newValidatorFn = (ctrl: AbstractControl) =>
    {
      const shouldValidate = predicate();
      if(!shouldValidate) return null;
      return validatorFn(ctrl);
    };

    return FormFacadeValidators.makeDependentValidator(flatten(dependents), newValidatorFn);
  }

  static conditionalRequired<I>(prop: IConditionalRequiredPropertyInfo<I, keyof I>, customMessage = ''): ValidatorFn
  {
    return FormFacadeValidators.conditionalRequiredMultiple([prop], customMessage);
  }

  static conditionalRequiredFromGroup<I>(formFacade: FormGroupFacade<I>, prop: IConditionalRequiredPropertyInfo<I, keyof I>, customMessage = ''): ValidatorFn
  {
    const fn = (ctrl: AbstractControl) =>
    {
      const { propName, value } = prop;
      const condition = formFacade.getValue(propName);
      const shouldValidate = FormFacadeValidators.isSameValueRequired(condition, value);
      return FormFacadeValidators.validateField(shouldValidate, ctrl, 'conditionalRequired', customMessage);
    };
    return FormFacadeValidators.makeDependentValidator([{ facade: formFacade, propName: prop.propName }], fn);
  }

  static conditionalRequiredMultiple<I>(props: IConditionalRequiredPropertyInfo<I, keyof I>[], customMessage = ''): ValidatorFn
  {
    const fn = (ctrl: AbstractControl) =>
    {
      const valuesForValidation = groupBy(props, p => p.propName);

      const shouldValidate = every(valuesForValidation, <K extends keyof I>(propArray: IConditionalRequiredPropertyInfo<I, K>[]) =>
      {
        return some(propArray, ({ propName, value }) =>
        {
          const NO_FACADE = {};
          const condition = FormGroupFacade.getFacadeFromChildControl(ctrl)?.getValue(propName) ?? NO_FACADE;
          if(condition === NO_FACADE) return false;
          return FormFacadeValidators.isSameValueRequired(condition, value);
        });
      });

      return FormFacadeValidators.validateField(shouldValidate, ctrl, 'conditionalRequired', customMessage);
    };
    return FormFacadeValidators.makeDependentValidator(map(props, p => p.propName), fn);
  }

  static validateField(shouldValidate: boolean, ctrl: AbstractControl, validatorName: string, customMessage = ''): ValidationErrors | null
  {
    if(!shouldValidate) return null;

    const valueToValidate = ctrl.value;
    if(FormFacadeValidators.hasValue(valueToValidate)) return null;

    const obj = {} as any;
    if(customMessage) obj.errorMessage = customMessage;

    return {
      [validatorName]: obj
    } as ValidationErrors;
  }

  static isSameValueRequired<T>(condition: any, value: ValueOrFn<T>): boolean
  {
    return FormFacadeValidators.hasValue(condition) && condition === getValue(value);
  }

  static hasValue(condition: any): boolean
  {
    let hasValue: boolean;
    if(isString(condition))
      hasValue = !isNullUndefinedEmpty(condition);
    else
      hasValue = !isNil(condition);
    return hasValue;
  }

  static composeValidators(validators: ValidatorFn[]): ValidatorFn
  {
    const dependents = this.getDependents(validators);
    const fn = Validators.compose(validators)!;
    return FormFacadeValidators.makeDependentValidator(flatten(dependents), fn);
  }

  static orValidators(validators: ValidatorFn[]): ValidatorFn
  {
    const dependents = this.getDependents(validators);
    const fn = (ctrl: AbstractControl) =>
    {
      const values = map(validators, v => v(ctrl));
      if(some(values, v => isNull(v))) return null;
      return assign({}, ...values);
    };
    return FormFacadeValidators.makeDependentValidator(flatten(dependents), fn);
  }

  static makeValidatorWarning(fn: ValidatorFn, transformFn: (errors: ValidationErrors) => ValidationErrors = identity): ValidatorFn
  {
    const warningValidatorFn = (c: FormControlWithWarning) =>
    {
      const output = fn(c);
      if(output)
        c.setWarning(transformFn(output));
      return null;
    };
    return FormFacadeValidators.makeDependentValidator(fn[CUSTOM_VALIDATOR_SYMBOL], warningValidatorFn);
  }

  /**
   * Creates a dependent validator.
   * The first argument is the array of properties that this validator depends on.
   */
  static makeDependentValidator<I>(prop: Dependents<I>[], fn: ValidatorFn): ValidatorFn
  {
    if(prop)
    {
      fn[CUSTOM_VALIDATOR_SYMBOL] = fn[CUSTOM_VALIDATOR_SYMBOL] || [];
      fn[CUSTOM_VALIDATOR_SYMBOL].push(...prop);
    }
    return fn;
  }

  private static getDependents(validators: ValidatorFn[]): Dependents<any>[]
  {
    return uniq(compact(map(validators, f => f[CUSTOM_VALIDATOR_SYMBOL])));
  }
}
