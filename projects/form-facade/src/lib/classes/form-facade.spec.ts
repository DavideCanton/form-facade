import { Component, ComponentFactory, OnInit } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { FormArrayW, FormControlW } from './form-control-w';
import { FormFacade } from './form-facade';
import { composeValidators, makeValidatorWarning } from './validators/validators';

interface FormModel
{
    name: string;
    surname: string;
    age: number;
}

// tslint:disable-next-line: no-big-function
describe('FormFacade', () =>
{
    it('should associate correctly facade and built FormGroup', () =>
    {
        const facade = new FormFacade<FormModel>({
            name: { initialValue: '' },
            surname: { initialValue: '' },
            age: { initialValue: 0 }
        });

        const group = facade.group;

        expect(FormFacade.getFormGroupFacade<FormModel>(group)).toBe(facade);
    });

    it('should return null if group is not build from a facade', () =>
    {
        const group = new FormGroup({});

        expect(FormFacade.getFormGroupFacade<FormModel>(group)).toBeNull();
    });

    it('should work with warnings and validators mixed', () =>
    {
        const facade = new FormFacade<FormModel>({
            name: {
                initialValue: 'aa',
                validator: composeValidators([
                    makeValidatorWarning(Validators.pattern(/^A.+/)),
                    Validators.minLength(3)
                ])
            },
            surname: { initialValue: '' },
            age: { initialValue: 0 }
        });

        expect(facade.hasWarnings).toBe(true);
        expect(facade.warnings.name.hasOwnProperty('pattern')).toBe(true);

        expect(facade.valid).toBe(false);
        expect(facade.errors.name.hasOwnProperty('minlength')).toBe(true);

        facade.patchValues({ name: 'Aaaa' });

        expect(facade.hasWarnings).toBe(false);
        expect(facade.warnings).toEqual(null);

        expect(facade.valid).toBe(true);
        expect(facade.errors).toBeNull();

        facade.patchValues({ name: 'Aa' });

        expect(facade.hasWarnings).toBe(false);
        expect(facade.warnings).toEqual(null);

        expect(facade.valid).toBe(false);
        expect(facade.errors.name.hasOwnProperty('minlength')).toBe(true);
    });

    it('should work with warnings', () =>
    {
        const facade = new FormFacade<FormModel>({
            name: { initialValue: 'aa', },
            surname: { initialValue: '' },
            age: {
                initialValue: 4,
                validator: makeValidatorWarning(Validators.min(5), (err) => ({ ...err, test: true }))
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
        interface Data
        {
            ns: string[];
            cs: { n: string }[];
        }


        const lengthMsg = (n: number) => 'length not > of ' + n;
        const patternObj = (requiredPattern, actualValue) => ({ requiredPattern, actualValue });
        const minLengthObj = (requiredLength, actualLength) => ({ requiredLength, actualLength });
        const arrayLengthGt = (n: number) => (ctrl: FormArray) => ctrl.value.length > n ? null : { arrayLengthGt: lengthMsg(n) };

        const facade = new FormFacade<Data>({
            ns: {
                initialValue: [],
                controlBuilder: () => new FormControlW('', composeValidators([
                    makeValidatorWarning(Validators.pattern(/^A.+/)),
                    Validators.minLength(3)
                ])),
                validator: composeValidators([
                    makeValidatorWarning(arrayLengthGt(3)),
                    arrayLengthGt(0)
                ])
            },
            cs: {
                initialValue: [],
                controlBuilder: () => ({
                    n: {
                        initialValue: '',
                        validator: composeValidators([
                            makeValidatorWarning(Validators.pattern(/^A.+/)),
                            Validators.minLength(3)
                        ])
                    }
                }),
                validator: composeValidators([
                    makeValidatorWarning(arrayLengthGt(3)),
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
        const facade = new FormFacade<FormModel>({
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

    it('should disable fields correctly from multiple conditions with default joiner', () =>
    {
        const facade = new FormFacade<FormModel>({
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

    it('should disable fields correctly from multiple conditions with custom joiner', () =>
    {
        const facade = new FormFacade<FormModel>({
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
                    joiner: v => v.every(x => x)
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
        const facade = new FormFacade<FormModel>({
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
        const facade = new FormFacade<FormModel>({
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

        const facadeWithDifferentOrder = new FormFacade<FormModel>({
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
        const facade = new FormFacade<FormModel>({
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
        const facade = new FormFacade<FormModel>({
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
        const facade = new FormFacade<FormModel>({
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
        interface SubEntity
        {
            x: number;
        }

        interface Entity
        {
            n: number;
            ns: string[];
            ns2: string[];
            cs: SubEntity[];
            cs2: SubEntity[];
        }

        const disable = new BehaviorSubject<boolean>(false);

        const invalidNumber = 'invalid number';
        const notGreaterThanMsg = (n: number) => 'x not greater than ' + n;
        const missingMsg = (s: string) => 'missing ' + s;

        const facade = new FormFacade<Entity>({
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
                validator: s => s.value.every((x: SubEntity) => x.x > 5) ? null : { x: notGreaterThanMsg(5) }
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
                validator: c => c.value.every((x: SubEntity) => x.x > 4) ? null : { x2: notGreaterThanMsg(4) }
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
        });
        expect(facade.valid).toBe(true);

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
        });
        expect(facade.valid).toBe(false);
        expect(facade.errors).toEqual({
            ns: { a: missingMsg('a') },
            ns2: {
                controlErrors: { a2: missingMsg('a') },
            },
            cs: { x: notGreaterThanMsg(5) },
            cs2: {
                controlErrors: { x2: notGreaterThanMsg(4) },
            },
        });

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
        });
        expect(facade.valid).toBe(false);
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
        });
    });

    it('should not propagate markAsDirtyRecursive to children', () =>
    {
        interface SubEntity
        {
            x: number;
        }

        interface Entity
        {
            cs2: SubEntity[];
        }

        const facade = new FormFacade<Entity>({
            cs2: {
                initialValue: [{ x: 10 }, { x: 20 }],
                controlBuilder: () => ({
                    x: {
                        initialValue: 0,
                    },
                }),
            },
        });

        let control = facade.getControl('cs2') as FormArrayW;
        expect(control.dirty).toBe(false);
        expect(control.controls[0].dirty).toBe(false);
        expect(control.controls[1].dirty).toBe(false);

        facade.markAsDirtyRecursive(false);

        control = facade.getControl('cs2') as FormArrayW;
        expect(control.dirty).toBe(true);
        expect(control.controls[0].dirty).toBe(true);
        expect(control.controls[1].dirty).toBe(true);
        expect(control.controls[0].get('x')!.dirty).toBe(true);
        expect(control.controls[1].get('x')!.dirty).toBe(true);
    });
});

interface Address
{
    street: string;
    streetNumber: string;
}

interface Person
{
    name: string;
    surname: string;
    age: number;
    otherNames: string[];
    addresses: Address[];
}

@Component({
    selector: 'ff-example',
    template: `
    <form [formGroup]="facade.group">
        <input id="name" formControlName="name"/>
        <input id="surname" formControlName="surname"/>
        <input id="age" type="number" formControlName="age"/>
        <input class="name-input" *ngFor="let v of otherNames.controls; index as i" [id]="'name-' + i" [formControl]="v"/>
        <ng-container *ngFor="let v of addresses.controls; index as i" [formGroup]="v">
            <div class="address-block">
        <input [id]="'street-' + i" formControlName="street"/>
        <input [id]="'street-number-' + i" formControlName="streetNumber"/>
</div>
        </ng-container>

    </form>
    `
})
class TestComponent implements OnInit
{
    facade: FormFacade<Person>;

    get otherNames(): FormArrayW
    {
        return this.facade.getControl('otherNames') as FormArrayW;
    }

    get addresses(): FormArrayW
    {
        return this.facade.getControl('addresses') as FormArrayW;
    }

    ngOnInit()
    {
        this.facade = new FormFacade({
            name: { initialValue: 'example name' },
            surname: { initialValue: 'example surname' },
            age: { initialValue: 18 },
            otherNames: {
                initialValue: ['name1', 'name2'],
                controlBuilder: () => new FormControl('')
            },
            addresses: {
                initialValue: [{ street: 'street1', streetNumber: '1' }],
                controlBuilder: () => ({
                    street: { initialValue: 'new street' },
                    streetNumber: { initialValue: 'new street number' },
                })
            }
        });
    }
}

describe('FormFacade in a component', () =>
{
    let fixture: ComponentFixture<TestComponent>;
    let component: TestComponent;

    beforeEach(waitForAsync(() =>
    {
        TestBed.configureTestingModule({
            declarations: [
                TestComponent
            ],
            imports: [
                ReactiveFormsModule
            ]
        }).compileComponents();
    }));

    beforeEach(() =>
    {
        fixture = TestBed.createComponent(TestComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the form and fill the values', () =>
    {
        expect(getControl('#name').value).toBe('example name');
        expect(getControl('#surname').value).toBe('example surname');
        expect(getControl('#age').value).toBe('18');
        expect(getControl('#name-0').value).toBe('name1');
        expect(getControl('#name-1').value).toBe('name2');
        expect(getControl('#street-0').value).toBe('street1');
        expect(getControl('#street-number-0').value).toBe('1');
    });

    it('should update the form from the model', () =>
    {
        component.facade.patchValues({ name: 'new name' });
        fixture.detectChanges();
        expect(getControl('#name').value).toBe('new name');

        component.facade.patchValues({
            otherNames: [
                'name1',
                'name3'
            ]
        });
        fixture.detectChanges();
        let elements = fixture.debugElement.queryAll(By.css('.name-input'));
        expect(elements.length).toBe(2);
        expect(getControl('#name-0').value).toBe('name1');
        expect(getControl('#name-1').value).toBe('name3');

        component.facade.patchValues({
            otherNames: [
                'name1',
                'name2',
                'name3'
            ]
        });
        fixture.detectChanges();
        elements = fixture.debugElement.queryAll(By.css('.name-input'));
        expect(elements.length).toBe(3);
        expect(getControl('#name-0').value).toBe('name1');
        expect(getControl('#name-1').value).toBe('name2');
        expect(getControl('#name-2').value).toBe('name3');

        component.facade.patchValues({
            otherNames: [
                'name1'
            ]
        });
        fixture.detectChanges();
        elements = fixture.debugElement.queryAll(By.css('.name-input'));
        expect(elements.length).toBe(1);
        expect(getControl('#name-0').value).toBe('name1');
    });

    function getControl(selector: string): HTMLInputElement
    {
        return fixture.debugElement.query(By.css(selector)).nativeElement;
    }
});
