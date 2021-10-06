import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import * as _ from 'lodash';

import { FormControlWithWarning } from './form-control-with-warning';
import { FormGroupFacade } from './form-group-facade';
import { getValue, isNullUndefinedEmpty, ValueOrFn } from './helpers';

// WARNING: auto mark as dependent not working for group validators
export const CUSTOM_VALIDATOR_SYMBOL = Symbol('custom_validator');

export type OnlyIfFn = (ctrl: AbstractControl) => boolean;

export interface IConditionalRequiredPropertyInfo<I, K extends keyof I>
{
  propName: K;
  value: ValueOrFn<I[K]>;
}

export interface IOuterFormPropName<T, K extends keyof T>
{
  facade: FormGroupFacade<T>;
  propName: K;
}

type DateOrStringOrNull = Date | string | null;

export function getSafeParentControlValue<I, K extends keyof I>(propName: K, ctrl: AbstractControl): I[K] | null
{
  if (!ctrl) return null;
  if (!ctrl.parent) return null;

  const { parent } = ctrl;
  const otherCtrl = parent.get(propName as string);

  return otherCtrl ? otherCtrl.value : null;
}

function getSafeControlValue<I, K extends keyof I>(propName: K, ctrl: AbstractControl): I[K] | null
{
  if (!ctrl) return null;

  const otherCtrl = ctrl.get(propName as string);

  return otherCtrl ? otherCtrl.value : null;
}

type Dependents<I> = keyof I | IOuterFormPropName<any, any>;

// @dynamic
export class AtFormValidators
{
  static conditionalValidation(predicate: () => boolean, validatorFn: ValidatorFn): ValidatorFn
  {
    const dependents = AtFormValidators.getDependents([validatorFn]);
    const newValidatorFn = ctrl =>
    {
      const shouldValidate = predicate();
      if (!shouldValidate) return null;
      return validatorFn(ctrl);
    };

    return AtFormValidators.makeDependentValidator(_.flatten(dependents), newValidatorFn);
  }

  static conditionalRequired<I>(prop: IConditionalRequiredPropertyInfo<I, keyof I>, customMessage = ''): ValidatorFn
  {
    return AtFormValidators.conditionalRequiredMultiple([prop], customMessage);
  }

  static conditionalRequiredFromGroup<I>(formFacade: FormGroupFacade<I>, prop: IConditionalRequiredPropertyInfo<I, keyof I>, customMessage = ''): ValidatorFn
  {
    const fn = (ctrl: AbstractControl) =>
    {
      const { propName, value } = prop;
      const condition = formFacade.getValue(propName);
      const shouldValidate = AtFormValidators.isSameValueRequired(condition, value);
      return AtFormValidators.validateField(shouldValidate, ctrl, 'conditionalRequired', customMessage);
    };
    return AtFormValidators.makeDependentValidator([{ facade: formFacade, propName: prop.propName }], fn);
  }

  static conditionalRequiredMultiple<I>(props: IConditionalRequiredPropertyInfo<I, keyof I>[], customMessage = ''): ValidatorFn
  {
    const fn = (ctrl: AbstractControl) =>
    {
      const valuesForValidation = _.groupBy(props, p => p.propName);

      const shouldValidate = _.every(valuesForValidation, <K extends keyof I>(propArray: IConditionalRequiredPropertyInfo<I, K>[]) =>
      {
        return _.some(propArray, ({ propName, value }) =>
        {
          const condition = getSafeParentControlValue<I, K>(propName, ctrl);
          return AtFormValidators.isSameValueRequired(condition, value);
        });
      });

      return AtFormValidators.validateField(shouldValidate, ctrl, 'conditionalRequired', customMessage);
    };
    return AtFormValidators.makeDependentValidator(_.map(props, p => p.propName), fn);
  }

  static validateField(shouldValidate: boolean, ctrl: AbstractControl, validatorName: string, customMessage = ''): ValidationErrors | null
  {
    if (!shouldValidate) return null;

    const valueToValidate = ctrl.value;
    if (AtFormValidators.hasValue(valueToValidate)) return null;

    const obj = {} as any;
    if (customMessage) obj.errorMessage = customMessage;

    return {
      [validatorName]: obj
    } as ValidationErrors;
  }

  static isSameValueRequired<T>(condition: any, value: ValueOrFn<T>): boolean
  {
    return AtFormValidators.hasValue(condition) && condition === getValue(value);
  }

  static hasValue(condition: any): boolean
  {
    let hasValue: boolean;
    if (_.isString(condition))
      hasValue = !isNullUndefinedEmpty(condition);
    else
      hasValue = !_.isNil(condition);
    return hasValue;
  }

  static composeValidators(validators: ValidatorFn[]): ValidatorFn
  {
    const dependents = this.getDependents(validators);
    // tslint:disable-next-line: no-unnecessary-type-assertion
    const fn = Validators.compose(validators)!;
    return AtFormValidators.makeDependentValidator(_.flatten(dependents), fn);
  }

  static orValidators(validators: ValidatorFn[]): ValidatorFn
  {
    const dependents = this.getDependents(validators);
    const fn = (ctrl: AbstractControl) =>
    {
      const values = _.map(validators, v => v(ctrl));
      if (_.some(values, v => _.isNull(v))) return null;
      return _.assign({}, ...values);
    };
    return AtFormValidators.makeDependentValidator(_.flatten(dependents), fn);
  }

  static makeValidatorWarning(fn: ValidatorFn, transformFn: (errors: ValidationErrors) => ValidationErrors = _.identity): ValidatorFn
  {
    const warningValidatorFn = (c: FormControlWithWarning) =>
    {
      const output = fn(c);
      if (output)
        c.setWarning(transformFn(output));
      return null;
    };
    return AtFormValidators.makeDependentValidator(fn[CUSTOM_VALIDATOR_SYMBOL], warningValidatorFn);
  }

  /**
   * Creates a dependent validator.
   * The first argument is the array of properties that this validator depends on.
   */
  static makeDependentValidator<I>(prop: Dependents<I>[], fn: ValidatorFn): ValidatorFn
  {
    if (prop)
    {
      fn[CUSTOM_VALIDATOR_SYMBOL] = fn[CUSTOM_VALIDATOR_SYMBOL] || [];
      fn[CUSTOM_VALIDATOR_SYMBOL].push(...prop);
    }
    return fn;
  }

  private static getDependents(validators: ValidatorFn[]): Dependents<any>[]
  {
    return _.uniq(_.compact(_.map(validators, f => f[CUSTOM_VALIDATOR_SYMBOL])));
  }
}
