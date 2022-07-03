import { AbstractControl, AbstractControlOptions, AsyncValidatorFn, FormArray, FormControl, FormGroup, ValidatorFn } from '@angular/forms';

export interface Warnings { [key: string]: any }

export interface ControlW
{
  readonly warnings: Warnings;
  readonly hasWarnings: boolean;

  addWarning(warning: Warnings): void;
  setWarning(warning: Warnings): void;
  clearWarning(): void;
}

function applyWarningMixin(ctrl: ControlW & AbstractControl)
{
  let _warnings: Warnings = {};

  const oldUpdate = ctrl.updateValueAndValidity;
  ctrl.updateValueAndValidity = function(...opts: Parameters<AbstractControl['updateValueAndValidity']>)
  {
    _warnings = {};
    oldUpdate.apply(ctrl, opts);
  };

  const oldDisable = ctrl.disable;
  ctrl.disable = function(...opts: Parameters<AbstractControl['disable']>)
  {
    _warnings = {};
    oldDisable.apply(ctrl, opts);
  };

  ctrl.addWarning = function(warning: Warnings)
  {
    if(warning)
    {
      this.setWarning({
        ...warning,
        ..._warnings
      });
    }
  };

  ctrl.setWarning = function(warning: Warnings)
  {
    _warnings = warning;
  };

  ctrl.clearWarning = function()
  {
    _warnings = {};
  };

  Object.defineProperties(
    ctrl,
    {
      warnings: {
        get()
        {
          if(this.hasWarnings)
            return { ..._warnings };

          return null;
        }
      },
      hasWarnings: {
        get()
        {
          return Object.keys(_warnings).length > 0;
        }
      }
    }
  );
}

function initControl(
  control: AbstractControl & ControlW,
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

export class FormControlW extends FormControl implements ControlW
{
  warnings: Warnings;
  hasWarnings: boolean;
  setWarning: (warning: Warnings) => void;
  addWarning: (warning: Warnings) => void;
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

export class FormArrayW extends FormArray implements ControlW
{
  warnings: Warnings;
  hasWarnings: boolean;
  setWarning: (warning: Warnings) => void;
  addWarning: (warning: Warnings) => void;
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

export class FormGroupW extends FormGroup implements ControlW
{
  warnings: Warnings;
  hasWarnings: boolean;
  setWarning: (warning: Warnings) => void;
  addWarning: (warning: Warnings) => void;
  clearWarning: () => void;

  constructor(
    formState: { [key: string]: AbstractControl },
    validator?: ValidatorFn | ValidatorFn[] | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null,
    opts?: AbstractControlOptions
  )
  {
    super(formState, opts);
    initControl(this, asyncValidator, validator);
  }
}
