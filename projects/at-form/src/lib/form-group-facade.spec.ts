import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { every, has } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormArrayWithWarning, FormControlWithWarning } from './form-control-with-warning';
import { FormGroupFacade } from './form-group-facade';
import { AtFormValidators } from './validators';

interface IFormModel
{
  name: string;
  surname: string;
  age: number;
}

// tslint:disable-next-line: no-big-function
describe('FormGroupFacade', () =>
{
  it('should associate correctly facade and built FormGroup', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: { initialValue: '' },
      surname: { initialValue: '' },
      age: { initialValue: 0 }
    });

    const group = facade.group;

    expect(FormGroupFacade.getFormGroupFacade<IFormModel>(group)).toBe(facade);
  });

  it('should return null if group is not build from a facade', () =>
  {
    const group = new FormGroup({});

    expect(FormGroupFacade.getFormGroupFacade<IFormModel>(group)).toBeNull();
  });

  it('should work with warnings and validators mixed', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();

    facade.buildFrom({
      name: {
        initialValue: 'aa',
        validator: AtFormValidators.composeValidators([
          AtFormValidators.makeValidatorWarning(Validators.pattern(/^A.+/)),
          Validators.minLength(3)
        ])
      },
      surname: { initialValue: '' },
      age: { initialValue: 0 }
    });

    expect(facade.hasWarnings).toBe(true);
    expect(has(facade.warnings, 'name.pattern')).toBe(true);

    expect(facade.valid).toBe(false);
    expect(has(facade.errors, 'name.minlength')).toBe(true);

    facade.patchValues({ name: 'Aaaa' });

    expect(facade.hasWarnings).toBe(false);
    expect(facade.warnings).toEqual(null);

    expect(facade.valid).toBe(true);
    expect(facade.errors).toBeNull();

    facade.patchValues({ name: 'Aa' });

    expect(facade.hasWarnings).toBe(false);
    expect(facade.warnings).toEqual(null);

    expect(facade.valid).toBe(false);
    expect(has(facade.errors, 'name.minlength')).toBe(true);
  });

  it('should work with warnings and validators mixed', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();

    facade.buildFrom({
      name: { initialValue: 'aa', },
      surname: { initialValue: '' },
      age: {
        initialValue: 4,
        validator: AtFormValidators.makeValidatorWarning(Validators.min(5), (err) => ({ ...err, test: true }))
      }
    });

    expect(facade.hasWarnings).toBe(true);
    expect(facade.warnings).toEqual({
      age: {
        min: { min: 5, actual: 4 },
        test: true
      }
    });
  });

  it('should work with warnings and validators mixed in array', () =>
  {
    interface I
    {
      ns: string[];
      cs: { n: string }[];
    }

    const facade = new FormGroupFacade<I>();

    const lengthMsg = (n: number) => 'length not > of ' + n;
    const patternObj = (requiredPattern, actualValue) => ({ requiredPattern, actualValue });
    const minLengthObj = (requiredLength, actualLength) => ({ requiredLength, actualLength });
    const arrayLengthGt = (n: number) => (ctrl: FormArray) =>
    {
      return ctrl.value.length > n ? null : { arrayLengthGt: lengthMsg(n) };
    };

    facade.buildFrom({
      ns: {
        initialValue: [],
        controlBuilder: () => new FormControlWithWarning('', AtFormValidators.composeValidators([
          AtFormValidators.makeValidatorWarning(Validators.pattern(/^A.+/)),
          Validators.minLength(3)
        ])),
        validator: AtFormValidators.composeValidators([
          AtFormValidators.makeValidatorWarning(arrayLengthGt(3)),
          arrayLengthGt(0)
        ])
      },
      cs: {
        initialValue: [],
        controlBuilder: () => ({
          n: {
            initialValue: '',
            validator: AtFormValidators.composeValidators([
              AtFormValidators.makeValidatorWarning(Validators.pattern(/^A.+/)),
              Validators.minLength(3)
            ])
          }
        }),
        validator: AtFormValidators.composeValidators([
          AtFormValidators.makeValidatorWarning(arrayLengthGt(3)),
          arrayLengthGt(0)
        ])
      }
    });

    expect(facade.hasWarnings).toBe(true);
    expect(facade.valid).toBe(false);

    expect(facade.errors).toEqual({
      ns: {
        controlErrors: { arrayLengthGt: lengthMsg(0) },
      },
      cs: {
        controlErrors: { arrayLengthGt: lengthMsg(0) },
      }
    });
    expect(facade.warnings).toEqual({
      ns: {
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      },
      cs: {
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      }
    });

    facade.patchValues({
      ns: ['Aaaa', 'Aaaa', 'Aaaa', 'Aaaa'],
      cs: [{ n: 'Aaaa' }, { n: 'Aaaa' }, { n: 'Aaaa' }, { n: 'Aaaa' }]
    });

    expect(facade.hasWarnings).toBe(false);
    expect(facade.valid).toBe(true);
    expect(facade.errors).toBeNull();
    expect(facade.warnings).toBeNull();

    facade.patchValues({
      ns: ['a'],
      cs: [{ n: 'a' }]
    });

    expect(facade.hasWarnings).toBe(true);
    expect(facade.valid).toBe(false);

    expect(facade.errors).toEqual({
      ns: {
        arrayErrors: { 0: { minlength: minLengthObj(3, 1) } },
      },
      cs: {
        arrayErrors: { 0: { n: { minlength: minLengthObj(3, 1) } } },
      }
    });
    expect(facade.warnings).toEqual({
      ns: {
        arrayWarnings: { 0: { pattern: patternObj('/^A.+/', 'a') } },
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      },
      cs: {
        arrayWarnings: { 0: { n: { pattern: patternObj('/^A.+/', 'a') } } },
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      }
    });

    facade.patchValues({
      ns: ['Aaa', 'Abb'],
      cs: [{ n: 'Aaa' }, { n: 'Aaa' }]
    });

    expect(facade.hasWarnings).toBe(true);
    expect(facade.warnings).toEqual({
      ns: {
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      },
      cs: {
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      }
    });
    expect(facade.valid).toBe(true);

    facade.patchValues({
      ns: ['Aaa', 'aaa', 'Aaaa'],
      cs: [{ n: 'Aaa' }, { n: 'aaa' }]
    });

    expect(facade.hasWarnings).toBe(true);

    expect(facade.warnings).toEqual({
      ns: {
        arrayWarnings: {
          1: { pattern: patternObj('/^A.+/', 'aaa') },
        },
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      },
      cs: {
        arrayWarnings: {
          1: { n: { pattern: patternObj('/^A.+/', 'aaa') } },
        },
        controlWarnings: { arrayLengthGt: lengthMsg(3) },
      }
    });

    expect(facade.valid).toBe(true);
  });

  it('should disable fields correctly with name+operator', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: {
        initialValue: '',
        disabledWhen: {
          name: 'age',
          operator: map(age => age > 10)
        }
      },
      surname: { initialValue: '' },
      age: { initialValue: 0 }
    });

    expect(facade.getControl('name').disabled).toBe(false);

    facade.patchValues({ age: 11 });

    expect(facade.getControl('name').disabled).toBe(true);
  });

  it('should disable fields correctly from multiple conditions with default joinFn', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: {
        initialValue: '',
        disabledWhen: {
          conditions: [
            {
              name: 'age',
              operator: map(age => age > 10)
            },
            {
              name: 'surname',
              operator: map(surname => surname.length > 0)
            }
          ]
        }
      },
      surname: { initialValue: '' },
      age: { initialValue: 0 }
    });

    expect(facade.getControl('name').disabled).toBe(false);

    facade.patchValues({ age: 11 });
    expect(facade.getControl('name').disabled).toBe(true);

    facade.patchValues({ age: 9, surname: 'Salvini' });
    expect(facade.getControl('name').disabled).toBe(true);

    facade.patchValues({ surname: '' });
    expect(facade.getControl('name').disabled).toBe(false);
  });

  it('should disable fields correctly from multiple conditions with custom joinFn', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: {
        initialValue: '',
        disabledWhen: {
          conditions: [
            {
              name: 'age',
              operator: map(age => age > 10)
            },
            {
              name: 'surname',
              operator: map(surname => surname.length > 0)
            }
          ],
          joinFn: every
        }
      },
      surname: { initialValue: '' },
      age: { initialValue: 0 }
    });

    expect(facade.getControl('name').disabled).toBe(false);

    facade.patchValues({ age: 11 });
    expect(facade.getControl('name').disabled).toBe(false);

    facade.patchValues({ surname: 'Salvini' });
    expect(facade.getControl('name').disabled).toBe(true);

    facade.patchValues({ age: 9 });
    expect(facade.getControl('name').disabled).toBe(false);

  });

  it('should reset initial values', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: { initialValue: 'Mucca' },
      surname: { initialValue: 'Carolina' },
      age: { initialValue: 10 }
    });
    facade.patchValues({ name: 'Toro', surname: 'Nero', age: 5 });
    facade.resetInitialValue();
    expect(facade.getValues()).toEqual({
      name: 'Mucca',
      surname: 'Carolina',
      age: 10
    });
  });

  it('should init fields correctly disabled with name+operator', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: {
        initialValue: '',
        disabledWhen: {
          name: 'age',
          operator: map(age => age > 10)
        }
      },
      surname: { initialValue: '' },
      age: { initialValue: 12 },
    });

    expect(facade.getControl('name').disabled).toBe(true);

    const facadeWithDifferentOrder = new FormGroupFacade<IFormModel>();
    facadeWithDifferentOrder.buildFrom({
      age: { initialValue: 12 },
      name: {
        initialValue: '',
        disabledWhen: {
          name: 'age',
          operator: map(age => age > 10)
        }
      },
      surname: { initialValue: '' },
    });

    expect(facadeWithDifferentOrder.getControl('name').disabled).toBe(true);
  });

  it('should disable fields correctly with observable', () =>
  {
    const subject = new BehaviorSubject<boolean>(false);
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: {
        initialValue: '',
        disabledWhen: subject
      },
      surname: { initialValue: '' },
      age: { initialValue: 0 }
    });

    expect(facade.getControl('name').disabled).toBe(false);

    subject.next(true);

    expect(facade.getControl('name').disabled).toBe(true);

    subject.next(false);

    expect(facade.getControl('name').disabled).toBe(false);
  });

  it('should return disabled fields with getValues(true)', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: {
        initialValue: 'name',
        disabledWhen: {
          name: 'age',
          operator: map(age => age > 10)
        }
      },
      surname: { initialValue: 'surname' },
      age: { initialValue: 12 }
    });

    expect(facade.getValues(true)).toEqual({
      name: 'name',
      surname: 'surname',
      age: 12
    });

    facade.patchValues({ age: 9 });

    expect(facade.getValues(true)).toEqual({
      name: 'name',
      surname: 'surname',
      age: 9
    });
  });

  it('should not return disabled fields with getValues(false)', () =>
  {
    const facade = new FormGroupFacade<IFormModel>();
    facade.buildFrom({
      name: {
        initialValue: 'name',
        disabledWhen: {
          name: 'age',
          operator: map(age => age > 10)
        }
      },
      surname: { initialValue: 'surname' },
      age: { initialValue: 12 }
    });

    expect(facade.getValues()).toEqual({
      surname: 'surname',
      age: 12
    });

    facade.patchValues({ age: 9 });

    expect(facade.getValues()).toEqual({
      name: 'name',
      surname: 'surname',
      age: 9
    });
  });

  it('should work with form arrays', () =>
  {
    interface ISubEntity
    {
      x: number;
    }

    interface IEntity
    {
      n: number;
      ns: string[];
      ns2: string[];
      cs: ISubEntity[];
      cs2: ISubEntity[];
    }

    const disable = new BehaviorSubject<boolean>(false);

    const facade = new FormGroupFacade<IEntity>();
    const invalidNumber = 'invalid number';
    const notGreaterThanMsg = (n: number) => 'x not greater than ' + n;
    const missingMsg = (s: string) => 'missing ' + s;

    facade.buildFrom({
      n: { initialValue: 0 },
      ns: {
        initialValue: [],
        disabledWhen: disable,
        validator: s => s.value.includes('a') ? null : { a: missingMsg('a') }
      },
      ns2: {
        initialValue: [],
        disabledWhen: disable,
        controlBuilder: () => new FormControl('', c => c.value !== '10' ? null : { x3: invalidNumber }),
        validator: s => s.value.includes('a') ? null : { a2: missingMsg('a') }
      },
      cs: {
        initialValue: [],
        disabledWhen: disable,
        validator: s => s.value.every((x: ISubEntity) => x.x > 5) ? null : { x: notGreaterThanMsg(5) }
      },
      cs2: {
        initialValue: [],
        disabledWhen: disable,
        controlBuilder: () => ({
          x: {
            initialValue: 0,
            validator: c => c.value !== 10 ? null : { x3: invalidNumber }
          },
        }),
        validator: c => c.value.every((x: ISubEntity) => x.x > 4) ? null : { x2: notGreaterThanMsg(4) }
      },
    });

    facade.patchValues({
      n: 1,
      ns: ['a', 'b', 'c'],
      ns2: ['a', 'b', 'c'],
      cs: [{ x: 6 }, { x: 7 }],
      cs2: [{ x: 6 }, { x: 5 }],
    });

    expect(facade.getValues()).toEqual({
      n: 1,
      ns: ['a', 'b', 'c'],
      ns2: ['a', 'b', 'c'],
      cs: [{ x: 6 }, { x: 7 }],
      cs2: [{ x: 6 }, { x: 5 }],
    }, 'First patchValues works');
    expect(facade.valid).toBe(true, 'Form is valid');

    facade.patchValues({
      n: 1,
      ns: ['b', 'c'],
      ns2: ['b', 'c'],
      cs: [{ x: 3 }, { x: 6 }, { x: 7 }],
      cs2: [{ x: 3 }, { x: 5 }, { x: 7 }],
    });
    expect(facade.getValues()).toEqual({
      n: 1,
      ns: ['b', 'c'],
      ns2: ['b', 'c'],
      cs: [{ x: 3 }, { x: 6 }, { x: 7 }],
      cs2: [{ x: 3 }, { x: 5 }, { x: 7 }],
    }, 'Second patchValues works');
    expect(facade.valid).toBe(false, 'Form became invalid');
    expect(facade.errors).toEqual({
      ns: { a: missingMsg('a') },
      ns2: {
        controlErrors: { a2: missingMsg('a') },
      },
      cs: { x: notGreaterThanMsg(5) },
      cs2: {
        controlErrors: { x2: notGreaterThanMsg(4) },
      },
    }, 'Validation errors are correct');

    facade.patchValues({
      n: 1,
      ns: ['b', 'c'],
      ns2: ['b', '10'],
      cs: [{ x: 3 }, { x: 6 }, { x: 7 }],
      cs2: [{ x: 3 }, { x: 5 }, { x: 10 }],
    });
    expect(facade.getValues()).toEqual({
      n: 1,
      ns: ['b', 'c'],
      ns2: ['b', '10'],
      cs: [{ x: 3 }, { x: 6 }, { x: 7 }],
      cs2: [{ x: 3 }, { x: 5 }, { x: 10 }],
    }, 'Second patchValues works');
    expect(facade.valid).toBe(false, 'Form became invalid');
    expect(facade.errors).toEqual({
      ns: { a: missingMsg('a') },
      ns2: {
        controlErrors: { a2: missingMsg('a') },
        arrayErrors: {
          1: { x3: invalidNumber }
        },
      },
      cs: { x: notGreaterThanMsg(5) },
      cs2: {
        controlErrors: { x2: notGreaterThanMsg(4) },
        arrayErrors: {
          2: { x: { x3: invalidNumber } }
        },
      },
    }, 'Validation errors are correct');
  });

  it('should not propagate markAsDirtyRecursive to children', () =>
  {
    interface ISubEntity
    {
      x: number;
    }

    interface IEntity
    {
      cs2: ISubEntity[];
    }

    const facade = new FormGroupFacade<IEntity>();

    facade.buildFrom({
      cs2: {
        initialValue: [{ x: 10 }, { x: 20 }],
        controlBuilder: () => ({
          x: {
            initialValue: 0,
          },
        }),
      },
    });

    let control = facade.getControl('cs2') as FormArrayWithWarning;
    expect(control.dirty).toBeFalse();
    expect(control.controls[0].dirty).toBeFalse();
    expect(control.controls[1].dirty).toBeFalse();

    facade.markAsDirtyRecursive(false);

    control = facade.getControl('cs2') as FormArrayWithWarning;
    expect(control.dirty).toBeTrue();
    expect(control.controls[0].dirty).toBeTrue();
    expect(control.controls[1].dirty).toBeTrue();
    expect(control.controls[0].get('x')!.dirty).toBeTrue();
    expect(control.controls[1].get('x')!.dirty).toBeTrue();
  });
});
