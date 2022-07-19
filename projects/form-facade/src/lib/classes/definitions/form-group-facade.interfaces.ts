import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, OperatorFunction } from 'rxjs';

import { Select } from './select-model';

type ElementOf<T> = T extends any[] ? T[number] : T;

export type Ks<T> = keyof T & string;

// WARNING: auto mark as dependent not working for group validators
export const CUSTOM_VALIDATOR_SYMBOL = Symbol('custom_validator');

/**
 * Enum corresponding to {@link FormControlStatus}
 */
export enum ValidationStatus {
    VALID = 'VALID',
    INVALID = 'INVALID',
    PENDING = 'PENDING',
    DISABLED = 'DISABLED',
}

/**
 * Defines a disabling condition depending on another field of the facade.
 *
 * For example `{ name: 'name', operator: map(v => v == 'John') }` means that
 * the field will be disabled if the value of the field `name` is `John`.
 */
export type IDisabledWhenField<T> = {
    [K in keyof T]: {
        /** the name of the field */
        name: K & string;
        /** the operator to apply to convert the current value to a boolean (`true` if disabled) */
        operator: OperatorFunction<T[K], boolean>;
    };
}[keyof T];

/**
 * Defines a whole disabling condition on a field of the form depending on many fields.
 * It executes all the conditions using {@link combineLatest}, then joins the outcomes
 * using the provided {@link joiner}, or {@link Array.prototype.some} if no {@link joiner} is provided.
 */
export interface DisabledWhenMultipleFields<T> {
    /** the array of conditions, depending on multiple fields */
    conditions: IDisabledWhenField<T>[];
    /**
     * The combination function, defaults to {@link Array.prototype.some}.
     * The input array keeps the same order of values in {@link conditions}.
     */
    joiner?: (b: boolean[]) => boolean;
}

export interface FormDefinition<T, K extends keyof T> {
    initialValue: T[K];
    validator?: ValidatorFn;
    asyncValidator?: AsyncValidatorFn;
    select?: Select[];
    disabledWhen?: Observable<boolean> | IDisabledWhenField<T> | DisabledWhenMultipleFields<T>;
}

export interface FormArrayDefinition<T, K extends keyof T> extends FormDefinition<T, K> {
    // eslint-disable-next-line no-use-before-define
    controlBuilder?: () => FormGroupDefinition<ElementOf<T[K]>> | AbstractControl;
}

/**
 * Definition of a form group.
 * Each property of {@link T} should be either a {@link FormArrayDefinition} if the field type is an array, else a {@link FormDefinition}.
 */
export type FormGroupDefinition<T> = {
    [K in keyof T]: T[K] extends any[] ? FormArrayDefinition<T, K> : FormDefinition<T, K>;
};

/**
 * Definition of a possible validator or async validator for each property of {@link T}.
 */
export type FormGroupValidatorDefinition<T> = {
    [K in keyof T]?: Pick<FormDefinition<T, K>, 'validator' | 'asyncValidator'>;
};

export interface FormDefinitionExtras {
    validator: ValidatorFn | null;
    asyncValidator: AsyncValidatorFn | null;
    autoMarkAsDependents: boolean;
    markDependentAsDirty: boolean;
    disabledWhen$?: Observable<boolean>;
}
