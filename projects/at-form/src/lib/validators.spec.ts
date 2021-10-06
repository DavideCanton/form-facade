import { fakeAsync, tick } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { has, isNull } from 'lodash';

import { FormControlWithWarning } from './form-control-with-warning';
import { FormGroupFacade } from './form-group-facade';
import { AtFormValidators, getSafeParentControlValue } from './validators';

describe('CustomValidators.conditionalValidation', () =>
{
  interface IForm
  {
    min: number | null;
    max: number | null;
  }

  let facade: FormGroupFacade<IForm>;
  let validate = false;

  beforeEach(() =>
  {
    facade = FormGroupFacade.buildFacadeFrom<IForm>({
      min: {
        initialValue: 0,
        validator: AtFormValidators.conditionalValidation(
          () => validate,
          AtFormValidators.composeValidators([
            Validators.required,
            AtFormValidators.makeDependentValidator<IForm>(
              ['max'],
              ctrl => getSafeParentControlValue<IForm, 'max'>('max', ctrl)! > ctrl.value ? null : { error: true }
            ),
          ])
        )
      },
      max: {
        initialValue: 100,
        validator: AtFormValidators.conditionalValidation(
          () => validate,
          AtFormValidators.composeValidators([
            Validators.required,
            AtFormValidators.makeDependentValidator<IForm>(
              ['min'],
              ctrl => getSafeParentControlValue<IForm, 'min'>('min', ctrl)! < ctrl.value ? null : { error: true }
            )
          ])
        )
      },
    });
  });

  function checkStatus(valid: boolean, minStatus: boolean | null = null, maxStatus: boolean | null = null)
  {
    expect(facade.valid).toBe(valid);
    expect(facade.getControl('min').valid).toBe(isNull(minStatus) ? valid : minStatus);
    expect(facade.getControl('max').valid).toBe(isNull(maxStatus) ? valid : maxStatus);
  }

  it('should validate when validate is true', fakeAsync(() =>
  {
    validate = true;
    facade.patchValues({ min: 2, max: 0 });
    tick();
    checkStatus(false);
    facade.patchValues({ max: 3 });
    tick();
    checkStatus(true);
    facade.patchValues({ min: 4 });
    tick();
    checkStatus(false);
    facade.patchValues({ min: null });
    tick();
    checkStatus(false, false, true);
  }));

  it('should not validate when validate is false', fakeAsync(() =>
  {
    validate = false;
    facade.patchValues({ min: 2, max: 0 });
    tick();
    checkStatus(true);
    facade.patchValues({ max: 3 });
    tick();
    checkStatus(true);
    facade.patchValues({ min: 4 });
    tick();
    checkStatus(true);
    facade.patchValues({ min: null });
    tick();
    checkStatus(true);
  }));

  it('should validate correctly when validate condition changes', fakeAsync(() =>
  {
    validate = true;
    facade.patchValues({ min: 2, max: 0 });
    tick();
    checkStatus(false);

    validate = false;
    facade.revalidate();
    tick();
    checkStatus(true);

    validate = true;
    facade.revalidate();
    tick();
    checkStatus(false);
  }));
});

enum EnumTest
{
  A = 'a',
  B = 'b',
  C = 'c'
}

interface ITest
{
  value: EnumTest;
  name: string;
  num: number | null;
}

describe('CommonValidatorFunctions.conditionalRequired', () =>
{
  it('should validate correctly', fakeAsync(() =>
  {
    const validator = AtFormValidators.conditionalRequired<ITest>({
      propName: 'value',
      value: EnumTest.A
    });

    const formFacade = new FormGroupFacade<ITest>();

    formFacade.buildFrom({
      value: { initialValue: EnumTest.B },
      num: { initialValue: null, validator },
      name: { initialValue: '' }
    });

    expect(formFacade.valid).toBe(true);

    formFacade.patchValues({ value: EnumTest.A });
    tick();

    expect(formFacade.valid).toBe(false);

    formFacade.patchValues({ num: 10 });
    tick();

    expect(formFacade.valid).toBe(true);
  }));

  describe('CommonValidatorFunctions.conditionalRequiredMultiple', () =>
  {
    it('should validate correctly', fakeAsync(() =>
    {
      const validator = AtFormValidators.conditionalRequiredMultiple<ITest>([{
        propName: 'value',
        value: EnumTest.A,
      }, {
        propName: 'value',
        value: EnumTest.B,
      }, {
        propName: 'name',
        value: 'name!',
      }]);

      const formFacade = new FormGroupFacade<ITest>();

      formFacade.buildFrom({
        value: { initialValue: EnumTest.B },
        num: { initialValue: null, validator },
        name: { initialValue: '' }
      });

      expect(formFacade.valid).toBe(true);

      formFacade.patchValues({ name: 'name!' });
      tick();

      expect(formFacade.valid).toBe(false);

      formFacade.patchValues({ value: EnumTest.C });
      tick();

      expect(formFacade.valid).toBe(true);

      formFacade.patchValues({ value: EnumTest.A, name: 'name!', num: 10 });
      tick();

      expect(formFacade.valid).toBe(true);
    }));
  });
});

describe('makeValidatorWarning', () =>
{
  it('should create a warning validator correctly', () =>
  {
    const warningValidator = AtFormValidators.makeValidatorWarning(Validators.required);
    const formControl = new FormControlWithWarning('', [warningValidator]);

    formControl.updateValueAndValidity();

    expect(formControl.hasWarnings).toBe(true);
    expect(formControl.warnings).toEqual({ required: true });

    formControl.setValue('a');
    formControl.updateValueAndValidity();

    expect(formControl.hasWarnings).toBe(false);
    expect(formControl.warnings).toEqual(null);
  });

  it('should mix correctly validators and warnings', () =>
  {
    const warningValidator = AtFormValidators.makeValidatorWarning(Validators.pattern(/^A.+/));
    const maxLengthValidator = Validators.minLength(3);
    const formControl = new FormControlWithWarning('aa', [
      warningValidator,
      maxLengthValidator
    ]);

    expect(formControl.hasWarnings).toBe(true);
    expect(has(formControl.warnings, 'pattern')).toBe(true);

    expect(formControl.invalid).toBe(true);
    expect(has(formControl.errors, 'minlength')).toBe(true);

    formControl.setValue('Aaaa');
    formControl.updateValueAndValidity();

    expect(formControl.hasWarnings).toBe(false);
    expect(formControl.warnings).toEqual(null);

    expect(formControl.valid).toBe(true);
    expect(formControl.errors).toBeNull();

    formControl.setValue('Aa');
    formControl.updateValueAndValidity();

    expect(formControl.hasWarnings).toBe(false);
    expect(formControl.warnings).toEqual(null);

    expect(formControl.invalid).toBe(true);
    expect(has(formControl.errors, 'minlength')).toBe(true);
  });
});
