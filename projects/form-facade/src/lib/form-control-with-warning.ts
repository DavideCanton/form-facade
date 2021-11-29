import { AbstractControl, AbstractControlOptions, AsyncValidatorFn, FormArray, FormControl, ValidatorFn } from '@angular/forms';

export interface IControlWithWarning
{
  warnings: any;
  hasWarnings: boolean;

  addWarning(warning: any): void;
  setWarning(warning: any): void;
  clearWarning(): void;
}

function applyWarningMixin(ctrl: IControlWithWarning & AbstractControl)
{
  let __warnings = {};

  const oldUpdate = ctrl.updateValueAndValidity;
  ctrl.updateValueAndValidity = function(...opts: Parameters<AbstractControl['updateValueAndValidity']>)
  {
    __warnings = {};
    oldUpdate.apply(ctrl, opts);
  };

  const oldDisable = ctrl.disable;
  ctrl.disable = function(...opts: Parameters<AbstractControl['disable']>)
  {
    __warnings = {};
    oldDisable.apply(ctrl, opts);
  };

  ctrl.addWarning = function(warning: any)
  {
    if(warning)
    {
      this.setWarning({
        ...warning,
        ...__warnings
      });
    }
  };

  ctrl.setWarning = function(warning: any)
  {
    __warnings = warning;
  };

  ctrl.clearWarning = function()
  {
    __warnings = {};
  };

  Object.defineProperties(
    ctrl,
    {
      warnings: {
        get()
        {
          if(this.hasWarnings)
            return { ...__warnings };

          return null;
        }
      },
      hasWarnings: {
        get()
        {
          return Object.keys(__warnings).length > 0;
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
  if(asyncValidator)
    control.setAsyncValidators(asyncValidator);
  if(validator)
    control.setValidators(validator);
  control.updateValueAndValidity();
}

export class FormControlWithWarning extends FormControl implements IControlWithWarning
{
  warnings: any;
  hasWarnings: boolean;
  setWarning: (warning: any) => void;
  addWarning: (warning: any) => void;
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
  setWarning: (warning: any) => void;
  addWarning: (warning: any) => void;
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
