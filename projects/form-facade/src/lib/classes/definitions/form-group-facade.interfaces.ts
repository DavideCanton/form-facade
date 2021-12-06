import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, OperatorFunction } from 'rxjs';

import { ISelectModel } from './select-model';

type ElementOf<T> = T extends any[] ? T[number] : T;


// WARNING: auto mark as dependent not working for group validators
export const CUSTOM_VALIDATOR_SYMBOL = Symbol('custom_validator');

export enum ValidationStatus
{
  VALID = 'VALID',
  INVALID = 'INVALID',
  PENDING = 'PENDING',
  DISABLED = 'DISABLED'
}

export type IFormGroupDefinition<T> = {
  [K in keyof T]: T[K] extends any[] ? IFormArrayDefinition<T[K], T> : IFormDefinition<T[K], T>;
};

export type IFormGroupValidatorDefinition<T> = Partial<{
  [K in keyof T]: Pick<IFormDefinition<T[K], T>, 'validator' | 'asyncValidator'>;
}>;

export type IDisabledWhenField<T, TK extends keyof T = keyof T> = {
  [K in keyof T]: {
    name: K;
    operator: OperatorFunction<T[K], boolean>
  }
}[TK];

export interface IDisabledWhenMultipleFields<T>
{
  conditions: IDisabledWhenField<T>[];
  /**
   * joinFn defaults to OR
   */
  joinFn?: (b: boolean[]) => boolean;
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
