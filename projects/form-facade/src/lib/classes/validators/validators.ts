import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { chain, flatten, identity } from 'lodash';

import { CUSTOM_VALIDATOR_SYMBOL } from '../definitions/form-group-facade.interfaces';
import { FormControlW } from '../form-control-w';
import { FormFacade } from '../form-facade';

export type ExtendedValidatorFn<T, K extends keyof T> = (
    ctrl: AbstractControl,
    values: Pick<T, K>,
    facade: FormFacade<T>
) => ValidationErrors | null;

/**
 * Combines validators using `Validators.compose` but keeping the dependencies.
 * @param validators the validators to compose
 * @returns a new validator function
 */
export function composeValidators(validators: ValidatorFn[]): ValidatorFn {
    const fn = Validators.compose(validators)!;
    const dependents = chain(getDependents(validators)).flatten().uniq().value();
    if (dependents) return makeDependentValidator<any>()(dependents, fn);
    else return fn;
}

/**
 * Decorates the provided validator by transforming it into a one that always
 * returns null, but sets warnings on the control.
 *
 * @param validator the validator to decorate
 * @param transformFn an optional function to transform the validation errors
 * @returns the decorated validator function
 */
export function warning(
    validator: ValidatorFn,
    transformFn: (errors: ValidationErrors) => ValidationErrors = identity
): ValidatorFn {
    const warningValidatorFn = (ctrl: FormControlW) => {
        const output = validator(ctrl);
        if (output) ctrl.addWarning(transformFn(output));
        return null;
    };
    const dependents = validator[CUSTOM_VALIDATOR_SYMBOL];
    if (dependents) return makeDependentValidator<any>()(dependents, warningValidatorFn);
    else return warningValidatorFn;
}

/**
 * Creates a new validator function that is dependent on the provided property names.
 *
 * This function is curried to allow proper type inference.
 *
 * Example usage:
 * ```typescript
 *
 * interface Form {
 *     name: string;
 *     age: number;
 * }
 *
 * new FormFacade<Form>({
 *     name: { initialValue: '' },
 *     age: {
 *         initialValue: 18,
 *         validator: makeDependentValidator()('name', (ctrl, { name }, facade) => {
 *             // here name is of type string
 *         })
 *     }
 * });
 * ```
 *
 * @returns the decorated validator function
 */
export function makeDependentValidator<T>(): <K extends keyof T>(
    prop: K,
    validator: ExtendedValidatorFn<T, K>
) => ValidatorFn;
export function makeDependentValidator<T>(): <K extends keyof T, K2 extends Exclude<keyof T, K>>(
    prop: [K, K2],
    validator: ExtendedValidatorFn<T, K | K2>
) => ValidatorFn;
export function makeDependentValidator<T>(): <
    K extends keyof T,
    K2 extends Exclude<keyof T, K>,
    K3 extends Exclude<keyof T, K | K2>
>(
    prop: [K, K2, K3],
    validator: ExtendedValidatorFn<T, K | K2 | K3>
) => ValidatorFn;
export function makeDependentValidator<T>(): (
    prop: (keyof T)[],
    validator: ExtendedValidatorFn<T, keyof T>
) => ValidatorFn;
export function makeDependentValidator<T>(): (
    prop: keyof T | (keyof T)[],
    exValidator: ExtendedValidatorFn<T, keyof T>
) => ValidatorFn {
    return (p, exValidator) => {
        let prop: (keyof T)[];
        if (!Array.isArray(p)) prop = [p];
        else prop = p;

        const validator = (ctrl: AbstractControl) => {
            const facade = FormFacade.getFacadeFromChild<T>(ctrl);
            if (!facade) return null;

            const values: any = {};
            for (const pp of prop) values[pp] = facade.getValue(pp);
            return exValidator(ctrl, values, facade);
        };
        validator[CUSTOM_VALIDATOR_SYMBOL] = validator[CUSTOM_VALIDATOR_SYMBOL] ?? [];
        validator[CUSTOM_VALIDATOR_SYMBOL].push(...prop);
        return validator;
    };
}

/**
 * Returns the property names that the provided validators are dependent on.
 * @param validators the validators to inspect
 * @returns the property names that the provided validators are dependent on
 */
export function getDependents(validators: ValidatorFn | ValidatorFn[]): (string | number)[] {
    return chain([validators])
        .flatten()
        .map(f => f[CUSTOM_VALIDATOR_SYMBOL])
        .flatten()
        .compact()
        .uniq()
        .value();
}
