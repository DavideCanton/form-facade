import { FormControl, Validators } from '@angular/forms';

import { ValidationStatus } from './definitions/form-group-facade.interfaces';
import { FormArrayW, FormControlW, FormGroupW } from './form-control-w';
import { warning } from './validators/validators';

describe('FormControlW', () => {
    it('should add warnings correctly', () => {
        const c = new FormControlW('');
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
        c.addWarning({ required: true });
        c.addWarning({ max: true });
        expect(c.hasWarnings).toBe(true);
        expect(c.warnings).toEqual({ required: true, max: true });
    });

    it('should set warnings correctly', () => {
        const c = new FormControlW('');
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
        c.setWarning({ required: true });
        c.setWarning({ max: true });
        expect(c.hasWarnings).toBe(true);
        expect(c.warnings).toEqual({ max: true });
    });

    it('should clear warnings correctly', () => {
        const c = new FormControlW('');
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
        c.addWarning({ required: true });
        c.addWarning({ max: true });
        expect(c.hasWarnings).toBe(true);
        expect(c.warnings).toEqual({ required: true, max: true });
        c.clearWarning();
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
    });

    it('should validate correctly', () => {
        const c = new FormControlW('', Validators.required);
        expect(c.invalid).toBe(true);
        expect(c.pristine).toBe(true);

        c.setValue('a');
        c.markAsDirty();

        expect(c.valid).toBe(true);
        expect(c.dirty).toBe(true);

        c.setValue('');

        expect(c.invalid).toBe(true);
    });

    it('should remove warnings when disabling', () => {
        const c = new FormControlW('ciao', warning(Validators.required));
        expect(c.hasWarnings).toBe(false);
        c.setValue('');
        expect(c.hasWarnings).toBe(true);

        c.disable();
        expect(c.hasWarnings).toBe(false);
        expect(c.status).toBe(ValidationStatus.DISABLED);

        c.enable();
        expect(c.hasWarnings).toBe(true);
        expect(c.status).toBe(ValidationStatus.VALID);
    });
});

describe('FormArrayW', () => {
    it('should add warnings correctly', () => {
        const c = new FormArrayW([]);
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
        c.addWarning({ required: true });
        c.addWarning({ max: true });
        expect(c.hasWarnings).toBe(true);
        expect(c.warnings).toEqual({ required: true, max: true });
    });

    it('should set warnings correctly on children', () => {
        const ctrl = new FormControlW();
        const c = new FormArrayW([ctrl]);
        expect(ctrl.hasWarnings).toBe(false);
        expect(ctrl.warnings).toBeNull();
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();

        ctrl.addWarning({ required: true });
        ctrl.addWarning({ max: true });
        expect(ctrl.hasWarnings).toBe(true);
        expect(ctrl.warnings).toEqual({ required: true, max: true });
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
    });

    it('should validate correctly', () => {
        const c = new FormArrayW([]);
        const validator = (ctrl: FormControl) => (ctrl.value.length > 0 ? null : { invalid: '' });
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

    it('should remove warnings when disabling', () => {
        const c = new FormArrayW(
            [],
            warning(control => (control.value.length > 0 ? null : { invalid: true }))
        );

        expect(c.hasWarnings).toBe(true);
        c.insert(0, new FormControl());
        expect(c.hasWarnings).toBe(false);
        c.removeAt(0);
        expect(c.hasWarnings).toBe(true);

        c.disable();
        expect(c.hasWarnings).toBe(false);
        expect(c.status).toBe(ValidationStatus.DISABLED);

        c.enable();
        expect(c.hasWarnings).toBe(true);
        expect(c.status).toBe(ValidationStatus.VALID);

        c.insert(0, new FormControl());
        expect(c.hasWarnings).toBe(false);
    });
});

describe('FormGroupW', () => {
    it('should add warnings correctly', () => {
        const c = new FormGroupW({
            ctrl: new FormControlW(''),
        });
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
        c.addWarning({ required: true });
        c.addWarning({ max: true });
        expect(c.hasWarnings).toBe(true);
        expect(c.warnings).toEqual({ required: true, max: true });
    });

    it('should set warnings correctly on children', () => {
        const ctrl = new FormControlW('');
        const c = new FormGroupW({ ctrl });
        expect(ctrl.hasWarnings).toBe(false);
        expect(ctrl.warnings).toBeNull();
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();

        ctrl.addWarning({ required: true });
        ctrl.addWarning({ max: true });
        expect(ctrl.hasWarnings).toBe(true);
        expect(ctrl.warnings).toEqual({ required: true, max: true });
        expect(c.hasWarnings).toBe(false);
        expect(c.warnings).toBeNull();
    });

    it('should validate correctly', () => {
        const validator = (ctrl: FormControl) => (ctrl.value.length > 0 ? null : { invalid: '' });
        const c = new FormGroupW({
            ctrl1: new FormControl('', validator),
            ctrl2: new FormControl('', validator),
        });

        expect(c.invalid).toBe(true);
        expect(c.pristine).toBe(true);

        c.setValue({ ctrl1: 'a', ctrl2: 'b' });
        c.markAsDirty();

        expect(c.valid).toBe(true);
        expect(c.dirty).toBe(true);

        c.setValue({ ctrl1: '', ctrl2: 'b' });

        expect(c.invalid).toBe(true);
    });

    it('should remove warnings when disabling', () => {
        const c = new FormGroupW(
            {
                ctrl: new FormControlW(''),
            },
            warning(control => (control.value.ctrl.length > 0 ? null : { invalid: true }))
        );

        expect(c.hasWarnings).toBe(true);
        c.patchValue({ ctrl: 'a' });
        expect(c.hasWarnings).toBe(false);
        c.patchValue({ ctrl: '' });
        expect(c.hasWarnings).toBe(true);

        c.disable();
        expect(c.hasWarnings).toBe(false);
        expect(c.status).toBe(ValidationStatus.DISABLED);

        c.enable();
        expect(c.hasWarnings).toBe(true);
        expect(c.status).toBe(ValidationStatus.VALID);

        c.patchValue({ ctrl: 'a' });
        expect(c.hasWarnings).toBe(false);
    });
});
