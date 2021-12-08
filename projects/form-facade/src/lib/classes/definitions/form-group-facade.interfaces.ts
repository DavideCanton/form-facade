import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, OperatorFunction } from 'rxjs';

import { ISelectModel } from './select-model';

type ElementOf<T> = T extends any[] ? T[number] : T;


// WARNING: auto mark as dependent not working for group validators
export const CUSTOM_VALIDATOR_SYMBOL = Symbol('custom_validator');

/**
 * Enum corresponding to {@link FormControlStatus}
 */
export enum ValidationStatus
{
  VALID = 'VALID',
  INVALID = 'INVALID',
  PENDING = 'PENDING',
  DISABLED = 'DISABLED'
}

/**
 * Definition of a form group.
 * Each property of {@link T} should be either a {@link IFormArrayDefinition} if the field type is an array, else a {@link IFormDefinition}.
 */
export type IFormGroupDefinition<T> = {
  [K in keyof T]: T[K] extends any[] ? IFormArrayDefinition<T[K], T> : IFormDefinition<T[K], T>;
};

/**
 * Definition of a possible validator or async validator for each property of {@link T}.
 */
export type IFormGroupValidatorDefinition<T> = Partial<{
  [K in keyof T]: Pick<IFormDefinition<T[K], T>, 'validator' | 'asyncValidator'>;
}>;

/**
 * Defines a disabling condition depending on another field of the facade.
 *
 * For example `{ name: 'name', operator: map(v => v == 'John') }` means that
 * the field will be disabled if the value of the field `name` is `John`.
 */
export type IDisabledWhenField<T, TK extends keyof T = keyof T> = {
  [K in keyof T]: {
    /** the name of the field */
    name: K;
    /** the operator to apply to convert the current value to a boolean (`true` if disabled) */
    operator: OperatorFunction<T[K], boolean>
  }
}[TK];

/**
 * Defines a whole disabling condition on a field of the form depending on many fields.
 * It executes all the conditions using {@link combineLatest}, then joins the outcomes
 * using the provided {@link joiner}, or {@link _.some} if no {@link joiner} is provided.
 */
export interface IDisabledWhenMultipleFields<T>
{
  /** the array of conditions, depending on multiple fields */
  conditions: IDisabledWhenField<T>[];
  /** the combination function, defaults to {@link _.some}. The input array keeps the same order of values in {@link conditions} */
  joiner?: (b: boolean[]) => boolean;
}

export interface IFormDefinition<T, TParent = any>
{
  initialValue: T;
  validator?: ValidatorFn;
  asyncValidator?: AsyncValidatorFn;
  select?: ISelectModel[];
  disabledWhen?: Observable<boolean> | IDisabledWhenField<TParent> | IDisabledWhenMultipleFields<TParent>;
}

export interface IFormArrayDefinition<T, TParent = any> extends IFormDefinition<T, TParent>
{
  controlBuilder?: () => IFormGroupDefinition<ElementOf<T>> | AbstractControl;
}

export interface IFormDefinitionExtras
{
  validator: ValidatorFn | null;
  asyncValidator: AsyncValidatorFn | null;
  autoMarkAsDependents: boolean;
  markDependentAsDirty: boolean;
  disabledWhen$?: Observable<boolean>;
}

export type IFormErrors<T> = { groupErrors?: ValidationErrors } & {
  [K in keyof T]?: ValidationErrors;
};
