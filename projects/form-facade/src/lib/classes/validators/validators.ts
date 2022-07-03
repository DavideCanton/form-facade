import { ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { chain, flatten, identity } from 'lodash';

import { CUSTOM_VALIDATOR_SYMBOL } from '../definitions/form-group-facade.interfaces';
import { FormControlW } from '../form-control-w';

/**
 * Combines validators using `Validators.compose` but keeping the dependencies.
 * @param validators the validators to compose
 * @returns a new validator function
 */
export function composeValidators(validators: ValidatorFn[]): ValidatorFn
{
  const dependents = getDependents(validators);
  const fn = Validators.compose(validators)!;
  return makeDependentValidator(chain(dependents).flatten().uniq().value(), fn);
}

/**
 * Decorates the provided validator by transforming it into a one that always
 * returns null, but sets warnings on the control.
 *
 * @param validator the validator to decorate
 * @param transformFn an optional function to transform the validation errors
 * @returns the decorated validator function
 */
export function makeValidatorWarning(
  validator: ValidatorFn,
  transformFn: (errors: ValidationErrors) => ValidationErrors = identity
): ValidatorFn
{
  const warningValidatorFn = (ctrl: FormControlW) =>
  {
    const output = validator(ctrl);
    if(output)
      ctrl.addWarning(transformFn(output));
    return null;
  };
  return makeDependentValidator(validator[CUSTOM_VALIDATOR_SYMBOL], warningValidatorFn);
}

/**
 * Creates a new validator function that is dependent on the provided property names.
 * @param prop the property names to depend on
 * @param validator the validator to decorate
 * @returns the decorated validator function
 */
export function makeDependentValidator<I>(prop: (keyof I)[], validator: ValidatorFn): ValidatorFn
{
  if(prop)
  {
    validator[CUSTOM_VALIDATOR_SYMBOL] = validator[CUSTOM_VALIDATOR_SYMBOL] ?? [];
    validator[CUSTOM_VALIDATOR_SYMBOL].push(...prop);
  }
  return validator;
}

/**
 * Returns the property names that the provided validators are dependent on.
 * @param validators the validators to inspect
 * @returns the property names that the provided validators are dependent on
 */
export function getDependents(validators: ValidatorFn | ValidatorFn[]): (string | number)[]
{
  return chain([validators])
    .flatten()
    .map(f => f[CUSTOM_VALIDATOR_SYMBOL])
    .flatten()
    .compact()
    .uniq()
    .value();
}
