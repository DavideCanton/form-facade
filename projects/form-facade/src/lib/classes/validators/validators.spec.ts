import { FormControl, Validators } from '@angular/forms';
import { constant, has } from 'lodash';

import { FormControlW } from '../form-control-w';
import { FormFacade } from '../form-facade';
import { composeValidators, getDependents, makeDependentValidator, warning } from './validators';

describe('makeDependentValidator', () => {
    it('should mark validator as dependent correctly', () => {
        const validator = makeDependentValidator<{ value: string }>()('value', constant(null));

        expect(getDependents(validator)).toEqual(['value']);
    });
});

describe('composeValidators', () => {
    it('should compose validators and keep dependents correctly', () => {
        interface Data {
            value: string;
            value2: string;
            value3: string;
        }

        const facade = new FormFacade<Data>({
            value: { initialValue: '' },
            value2: { initialValue: '' },
            value3: {
                initialValue: '',
                validator: composeValidators([
                    makeDependentValidator<Data>()('value', Validators.required),
                    makeDependentValidator<Data>()('value2', ({ value }) =>
                        value.length <= 1 ? { tooShort: true } : null
                    ),
                ]),
            },
        });

        const ctrl = facade.getControl('value3');
        const validator = ctrl.validator;
        expect(getDependents(validator)).toEqual(['value', 'value2']);

        expect(ctrl.errors).toEqual({ required: true, tooShort: true });
        expect(ctrl.valid).toBe(false);
        ctrl.setValue('a');
        expect(ctrl.errors).toEqual({ tooShort: true });
        expect(ctrl.valid).toBe(false);
        ctrl.setValue('aaaa');
        expect(ctrl.errors).toEqual(null);
        expect(ctrl.valid).toBe(true);
    });
});

describe('makeValidatorWarning', () => {
    it('should create a warning validator correctly', () => {
        const warningValidator = warning(Validators.required);
        const formControl = new FormControlW('', [warningValidator]);

        formControl.updateValueAndValidity();

        expect(formControl.hasWarnings).toBe(true);
        expect(formControl.warnings).toEqual({ required: true });

        formControl.setValue('a');
        formControl.updateValueAndValidity();

        expect(formControl.hasWarnings).toBe(false);
        expect(formControl.warnings).toEqual(null);
    });

    it('should mix correctly validators and warnings', () => {
        const warningValidator = warning(Validators.pattern(/^A.+/));
        const maxLengthValidator = Validators.minLength(3);
        const formControl = new FormControlW('aa', [warningValidator, maxLengthValidator]);

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
