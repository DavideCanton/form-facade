import { has, isFunction, isNil, keys, reduce } from 'lodash';

import { IDisabledWhenField, IDisabledWhenMultipleFields, IFormArrayDefinition, IFormDefinition, ValueOrFn } from '../definitions/form-group-facade.interfaces';
import { FormFacade } from '../form-facade';

export interface IOuterFormPropName<T, K extends keyof T>
{
  facade: FormFacade<T>;
  propName: K;
}

export function isFormDefinitionArrayWithControlBuilder(v: IFormDefinition<any>): v is Required<IFormArrayDefinition<any>>
{
  return !!(v as any).controlBuilder;
}

export function isDisabledWhenMultipleFields<T>(v: IDisabledWhenMultipleFields<T> | IDisabledWhenField<T>): v is IDisabledWhenMultipleFields<T>
{
  return has(v, 'conditions');
}

export const FORM_GROUP_FACADE_SYMBOL = Symbol('form-group-facade-ref');

export function getValue<T>(value: ValueOrFn<T>): T
{
  if (isFunction(value))
    return value();
  else
    return value;
}

export function isNullUndefinedEmpty(val: any): boolean
{
  return isNil(val) || val === '';
}

/**
 * Formats the template by using elements in args array. The placeholders are replaced by position.
 *
 * Example:
 *
 * formatString('{0} + {1} = {2}', 1, 2, 3) -> '1 + 2 = 3'
 *
 * @param template the template
 * @param args the arguments array
 */
export function formatString(template: string, ...args: any[]): string
{
  return reduce(
    args,
    (current, arg, n) =>
    {
      const replace = `\\{${n}\\}`;
      const regExp = new RegExp(replace, 'g');
      return current.replace(regExp, arg);
    },
    template
  );
}

/**
 * Formats the template by using elements in params object. The placeholders are replaced by name.
 *
 * Example:
 *
 * formatStringByName('{value} is not in range {min} - {max}', { value: 1, min: 2, max: 3 }) -> '1 is not in range 2 - 3'
 *
 * @param template the template
 * @param params the values object
 */
export function formatStringByName(template: string, params: object): string
{
  return reduce(
    keys(params),
    (current, paramName) =>
    {
      const value = params[paramName];
      const replace = `\\{${paramName}\\}`;
      const regExp = new RegExp(replace, 'g');
      return current.replace(regExp, value);
    },
    template
  );
}