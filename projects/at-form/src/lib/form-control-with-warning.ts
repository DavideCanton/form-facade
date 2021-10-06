import { AbstractControl, AbstractControlOptions, AsyncValidatorFn, FormArray, FormControl, ValidatorFn } from '@angular/forms';

export interface IControlWithWarning
{
  warnings: any;
  hasWarnings: boolean;

  setWarning(warning: any, replace?: boolean): void;
  clearWarning(): void;
}

function applyWarningMixin(ctrl: IControlWithWarning & AbstractControl)
{
  (ctrl as any)._warnings = {};

  const oldUpdate = ctrl.updateValueAndValidity;
  ctrl.updateValueAndValidity = function (...opts: Parameters<AbstractControl['updateValueAndValidity']>)
  {
    this._warnings = {};
    oldUpdate.apply(ctrl, opts);
  };

  const oldDisable = ctrl.disable;
  ctrl.disable = function (...opts: Parameters<AbstractControl['disable']>)
  {
    this._warnings = {};
    oldDisable.apply(ctrl, opts);
  };

  ctrl.setWarning = function (warning: any, replace = false)
  {
    if (warning)
    {
      if (replace)
        this._warnings = warning;
      else
        this._warnings = {
          ...warning,
          ...this._warnings
        };
    }
  };

  ctrl.clearWarning = function ()
  {
    this._warnings = {};
  };

  Object.defineProperties(
    ctrl,
    {
      warnings: {
        get()
        {
          if (this.hasWarnings)
            return { ...this._warnings };

          return null;
        }
      },
      hasWarnings: {
        get()
        {
          return Object.keys(this._warnings).length > 0;
        }
      }
    }
  );
}

function initControl(
  control: AbstractControl & IControlWithWarning,
  asyncValidator: AsyncValidatorFn | AsyncValidatorFn[] | null | undefined,
  validator: ValidatorFn | ValidatorFn[] | null | undefined
)
{
  applyWarningMixin(control);
  if (asyncValidator)
    control.setAsyncValidators(asyncValidator);
  if (validator)
    control.setValidators(validator);
  control.updateValueAndValidity();
}

export class FormControlWithWarning extends FormControl implements IControlWithWarning
{
  warnings: any;
  hasWarnings: boolean;
  // tslint:disable-next-line:bool-param-default
  setWarning: (warning: any, replace?: boolean) => void;
  clearWarning: () => void;

  constructor(
    formState?: any,
    validator?: ValidatorFn | ValidatorFn[] | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null,
    opts?: AbstractControlOptions
  )
  {
    super(formState, opts);
    initControl(this, asyncValidator, validator);
  }

}

export class FormArrayWithWarning extends FormArray implements IControlWithWarning
{
  warnings: any;
  hasWarnings: boolean;
  // tslint:disable-next-line:bool-param-default
  setWarning: (warning: any, replace?: boolean) => void;
  clearWarning: () => void;

  constructor(
    formState: AbstractControl[],
    validator?: ValidatorFn | ValidatorFn[] | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null,
    opts?: AbstractControlOptions
  )
  {
    super(formState, opts);
    initControl(this, asyncValidator, validator);
  }
}
