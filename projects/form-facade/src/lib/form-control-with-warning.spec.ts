import { FormControl, Validators } from '@angular/forms';

import { FormArrayWithWarning, FormControlWithWarning } from './form-control-with-warning';
import { ValidationStatus } from './form-group-facade.interfaces';
import { FormFacadeValidators } from './validators';

describe('FormControlWithWarning', () =>
{
  it('should set warnings correctly', () =>
  {
    const c = new FormControlWithWarning('');
    expect(c.hasWarnings).toBe(false);
    expect(c.warnings).toBeNull();
    c.setWarning({ required: true });
    c.setWarning({ max: true });
    expect(c.hasWarnings).toBe(true);
    expect(c.warnings).toEqual({ required: true, max: true });
  });

  it('should replace warnings correctly', () =>
  {
    const c = new FormControlWithWarning('');
    expect(c.hasWarnings).toBe(false);
    expect(c.warnings).toBeNull();
    c.setWarning({ required: true }, true);
    c.setWarning({ max: true }, true);
    expect(c.hasWarnings).toBe(true);
    expect(c.warnings).toEqual({ max: true });
  });

  it('should clear warnings correctly', () =>
  {
    const c = new FormControlWithWarning('');
    expect(c.hasWarnings).toBe(false);
    expect(c.warnings).toBeNull();
    c.setWarning({ required: true });
    c.setWarning({ max: true });
    expect(c.hasWarnings).toBe(true);
    expect(c.warnings).toEqual({ required: true, max: true });
    c.clearWarning();
    expect(c.hasWarnings).toBe(false);
    expect(c.warnings).toBeNull();
  });

  it('should validate correctly', () =>
  {
    const c = new FormControlWithWarning('', Validators.required);
    expect(c.invalid).toBe(true);
    expect(c.pristine).toBe(true);

    c.setValue('a');
    c.markAsDirty();

    expect(c.valid).toBe(true);
    expect(c.dirty).toBe(true);

    c.setValue('');

    expect(c.invalid).toBe(true);
  });

  it('should remove warnings when disabling', () =>
  {
    const c = new FormControlWithWarning(
      'ciao',
      FormFacadeValidators.makeValidatorWarning(Validators.required)
    );
    expect(c.hasWarnings).toBe(false);
    c.setValue('');
    expect(c.hasWarnings).toBe(true);

    c.disable();
    expect(c.hasWarnings).toBe(false);
    expect(c.status).toBe(ValidationStatus.Disabled);

    c.enable();
    expect(c.hasWarnings).toBe(true);
    expect(c.status).toBe(ValidationStatus.Valid);
  });
});

describe('FormArrayWithWarning', () =>
{
  it('should set warnings correctly', () =>
  {
    const c = new FormArrayWithWarning([]);
    expect(c.hasWarnings).toBe(false);
    expect(c.warnings).toBeNull();
    c.setWarning({ required: true });
    c.setWarning({ max: true });
    expect(c.hasWarnings).toBe(true);
    expect(c.warnings).toEqual({ required: true, max: true });
  });

  it('should set warnings correctly on children', () =>
  {
    const ctrl = new FormControlWithWarning();
    const c = new FormArrayWithWarning([ctrl]);
    expect(ctrl.hasWarnings).toBe(false);
    expect(ctrl.warnings).toBeNull();
    expect(c.hasWarnings).toBe(false);
    expect(c.warnings).toBeNull();

    ctrl.setWarning({ required: true });
    ctrl.setWarning({ max: true });
    expect(ctrl.hasWarnings).toBe(true);
    expect(ctrl.warnings).toEqual({ required: true, max: true });
    expect(c.hasWarnings).toBe(false);
    expect(c.warnings).toBeNull();
  });

  it('should validate correctly', () =>
  {
    const c = new FormArrayWithWarning([]);
    const validator = (ctrl: FormControl) => ctrl.value.length > 0 ? null : { invalid: '' };
    c.push(new FormControl('', validator));
    c.push(new FormControl('', validator));

    expect(c.invalid).toBe(true);
    expect(c.pristine).toBe(true);

    c.setValue(['a', 'b']);
    c.markAsDirty();

    expect(c.valid).toBe(true);
    expect(c.dirty).toBe(true);

    c.setValue(['', 'b']);

    expect(c.invalid).toBe(true);
  });

  it('should remove warnings when disabling', () =>
  {
    const c = new FormArrayWithWarning(
      [],
      FormFacadeValidators.makeValidatorWarning(control => control.value.length > 0 ? null : { invalid: true })
    );

    expect(c.hasWarnings).toBe(true);
    c.insert(0, new FormControl());
    expect(c.hasWarnings).toBe(false);
    c.removeAt(0);
    expect(c.hasWarnings).toBe(true);

    c.disable();
    expect(c.hasWarnings).toBe(false);
    expect(c.status).toBe(ValidationStatus.Disabled);

    c.enable();
    expect(c.hasWarnings).toBe(true);
    expect(c.status).toBe(ValidationStatus.Valid);

    c.insert(0, new FormControl());
    expect(c.hasWarnings).toBe(false);
  });
});
