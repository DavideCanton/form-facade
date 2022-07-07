import { AbstractControl, UntypedFormArray, UntypedFormGroup } from '@angular/forms';
import { combineLatest, isObservable, Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';

import { Select, SelectManager } from './definitions/select-model';
import { FormArrayW, FormControlW, ControlW } from './form-control-w';
import { CUSTOM_VALIDATOR_SYMBOL, IDisabledWhenField, DisabledWhenMultipleFields, FormArrayDefinition, FormDefinition, FormDefinitionExtras, FormErrors, FormGroupDefinition, FormGroupValidatorDefinition } from './definitions/form-group-facade.interfaces';

const FORM_GROUP_FACADE_SYMBOL = Symbol('form-group-facade-ref');


export class FormFacade<T>
{
    private innerGroup: UntypedFormGroup;
    private selectModels: Partial<Record<keyof T, SelectManager>>;
    private formArrayKeys = new Set<keyof T>();
    private extraComplete: FormDefinitionExtras;

    constructor(
        private formDefinition: FormGroupDefinition<T>,
        extra?: Partial<FormDefinitionExtras> | null
    )
    {
        this.extraComplete = this.buildDefaultExtras(extra);

        const values: Record<keyof T, AbstractControl> = Object.keys(formDefinition).reduce((vv, key) =>
        {
            const valueCast = formDefinition[key] as FormDefinition<any> | FormArrayDefinition<any>;
            const control = this.createControl(valueCast);
            if(control instanceof FormArrayW)
                this.formArrayKeys.add(key as keyof T);
            return { ...vv, [key]: control };
        }, {} as Record<keyof T, AbstractControl>);

        this.innerGroup = new UntypedFormGroup(values, this.extraComplete.validator, this.extraComplete.asyncValidator);
        this.innerGroup[FORM_GROUP_FACADE_SYMBOL] = this;

        this.selectModels = {};
        const selectModelKeys = this.computeSelectModels();

        selectModelKeys.forEach(k =>
        {
            const modelManager = this.selectModels[k] = new SelectManager();
            modelManager.setValues(this.formDefinition[k].select);
            this.group.get(k)!.valueChanges.subscribe(v => modelManager.setSelectedId(v));
            const initialValue = this.formDefinition[k as keyof T].initialValue;
            if(initialValue != null)
                modelManager.setSelectedId(this.formDefinition[k].initialValue as any);
        });

        Object.entries<FormGroupDefinition<T>[keyof T]>(formDefinition as any).forEach(([k, v]) =>
        {
            this.initControl(v, values, k);
        });

        if(this.extraComplete.autoMarkAsDependents)
            this.markDependents(this.extraComplete);
    }

    get group(): UntypedFormGroup
    {
        return this.innerGroup;
    }

    get dirty(): boolean
    {
        return this.group.dirty;
    }

    get valid(): boolean
    {
        return this.group.valid;
    }

    get keys(): (keyof T)[]
    {
        return Object.keys(this.formDefinition) as (keyof T)[];
    }

    get hasWarnings(): boolean
    {
        return !!this.warnings;
    }

    get warnings(): FormErrors<T> | null
    {
        const warnings = {} as FormErrors<T>;

        Object.keys(this.formDefinition).forEach(k =>
        {
            const ctrl = this.getControl(k as keyof T);
            const controlWarnings = this.getWarningsOrErrorsForControl(ctrl, 'warnings');
            if(controlWarnings)
                warnings[k] = controlWarnings;
        });

        return Object.keys(warnings).length > 0 ? warnings : null;
    }

    get errors(): FormErrors<T> | null
    {
        const errors = {} as FormErrors<T>;

        if(this.group.errors)
            errors.groupErrors = this.group.errors;

        Object.keys(this.formDefinition).forEach(k =>
        {
            const ctrl = this.getControl(k as keyof T);
            const controlErrors = this.getWarningsOrErrorsForControl(ctrl, 'errors');
            if(controlErrors)
                errors[k] = controlErrors;
        });

        return Object.keys(errors).length > 0 ? errors : null;
    }


    static getFormGroupFacade<T>(group: UntypedFormGroup): FormFacade<T> | null
    {
        return group[FORM_GROUP_FACADE_SYMBOL] || null;
    }

    private static buildInnerControlForArray<T>(v: Required<FormArrayDefinition<T>>, x: T): AbstractControl
    {
        const defOrControl = v.controlBuilder();
        if(defOrControl instanceof AbstractControl)
        {
            defOrControl.reset(x);
            return defOrControl;
        }

        const facade = new FormFacade(defOrControl);
        facade.reset(x);
        return facade.group;
    }

    getValues(includeDisabledFields = false): Partial<T>
    {
        if(!includeDisabledFields)
            return this.group.value;
        else
            return this.group.getRawValue();
    }

    updateValidators(def: FormGroupValidatorDefinition<T>, fireValidators = false)
    {
        Object.keys(def).forEach(k =>
        {
            const key = k as keyof T;
            const vDef = def[key];
            if(!vDef) return;
            const keyS = String(key);

            const control = this.getControl(key);
            if(vDef.validator)
            {
                if(control.validator) throw new Error(`Validators overridden for control ${keyS}`);
                control.setValidators(vDef.validator);
            }
            if(vDef.asyncValidator)
            {
                if(control.asyncValidator) throw new Error(`Async validators overridden for control ${keyS}`);
                control.setAsyncValidators(vDef.asyncValidator);
            }
        });

        if(this.extraComplete.autoMarkAsDependents)
            this.markDependents(this.extraComplete, Object.keys(def) as (keyof T)[]);

        if(fireValidators)
            this.revalidate();
    }

    getControl<K extends keyof T>(key: K): FormControlW | FormArrayW
    {
        return this.group.get(key as string)! as FormControlW | FormArrayW;
    }

    hasControl(key: string): boolean
    {
        return !!this.group.get(key);
    }

    getValue<K extends keyof T>(key: K): T[K]
    {
        return this.getControl(key).value;
    }

    patchValues(values: Partial<T>, options?: { onlySelf?: boolean; emitEvent?: boolean })
    {
        this.alignFormArrays(values);
        this.group.patchValue(values, options);
        if(options && !options.emitEvent)
        {
            Object.entries(values).forEach(([k, v]) =>
            {
                const manager = this.getSelectModel(k as keyof T);
                if(manager)
                    manager.setSelectedId(v as any);
            });
        }
    }

    resetInitialValue()
    {
        this.reset(this.getInitialValues());
    }

    getInitialValues(): T
    {
        return Object.keys(this.formDefinition).reduce((acc, k) => ({
            ...acc,
            [k]: this.formDefinition[k].initialValue
        }), {}) as T;
    }

    revalidate()
    {
        Object.keys(this.formDefinition).forEach(key =>
        {
            this.getControl(key as keyof T).updateValueAndValidity({ onlySelf: true });
        });
        this.group.updateValueAndValidity();
    }

    setValues(values: T)
    {
        this.alignFormArrays(values);
        this.group.setValue(values);
    }

    reset(values?: Partial<T>)
    {
        if(values)
            this.alignFormArrays(values);
        this.group.reset(values);
    }

    getSelectModel(key: keyof T): SelectManager | null
    {
        const m = this.selectModels[key] as SelectManager | undefined;
        return m || null;
    }

    getSelectValues(key: keyof T): Select[] | null
    {
        const model = this.getSelectModel(key);
        return model ? model.getValues() : null;
    }

    getSelectValue(key: keyof T): Select | null
    {
        const model = this.getSelectModel(key);
        return model ? model.selectedValue : null;
    }

    markAsDependent(key1: keyof T, key2: keyof T, markAsDirty = true)
    {
        this.getControl(key1).valueChanges.pipe(
            distinctUntilChanged(),
            debounceTime(0)
        ).subscribe(() =>
        {
            const ctrl = this.getControl(key2);
            ctrl.updateValueAndValidity();
            if(markAsDirty)
                ctrl.markAsDirty();
        });
    }

    restorePristineState()
    {
        Object.keys(this.formDefinition).forEach(k =>
        {
            const control = this.getControl(k as keyof FormGroupDefinition<T>);
            control.markAsPristine({ onlySelf: true });
            control.markAsUntouched({ onlySelf: true });
            control.updateValueAndValidity();
        });
    }

    markAsDirty(onlyInvalid = true)
    {
        Object.keys(this.formDefinition).forEach(k =>
        {
            const control = this.getControl(k as keyof FormGroupDefinition<T>);
            if(!onlyInvalid || control.invalid)
            {
                if(control instanceof UntypedFormArray)
                {
                    control.controls.forEach(childControl =>
                    {
                        childControl.markAsDirty({ onlySelf: true });
                        childControl.markAsTouched({ onlySelf: true });
                        childControl.updateValueAndValidity({ emitEvent: false, onlySelf: true });
                    });
                }

                control.markAsDirty({ onlySelf: true });
                control.markAsTouched({ onlySelf: true });
                control.updateValueAndValidity();
            }
        });
    }

    markAsDirtyRecursive(onlyInvalid = true)
    {
        const queue: AbstractControl[] = [];
        Object.keys(this.formDefinition).forEach(k =>
        {
            const control = this.getControl(k as keyof FormGroupDefinition<T>);
            queue.push(control);
        });

        while(queue.length > 0)
        {
            const control = queue.pop()!;
            if(!onlyInvalid || control.invalid)
            {
                if(control instanceof UntypedFormArray || control instanceof UntypedFormGroup)
                {
                    const controls = control instanceof UntypedFormArray ?
                        control.controls :
                        Object.entries(control.controls).map(v => v[1]);

                    controls.forEach((childControl: AbstractControl) =>
                    {
                        childControl.markAsDirty({ onlySelf: true });
                        childControl.markAsTouched({ onlySelf: true });
                        childControl.updateValueAndValidity({ emitEvent: false, onlySelf: true });
                        queue.push(childControl);
                    });
                }

                control.markAsDirty({ onlySelf: true });
                control.markAsTouched({ onlySelf: true });
                control.updateValueAndValidity();
            }
        }
    }

    private markDependents(extras: FormDefinitionExtras, keysToUpdate: (keyof T)[] | null = null)
    {
        Object.keys(this.formDefinition).forEach(key =>
        {
            if(keysToUpdate !== null && !keysToUpdate.includes(key as keyof T))
                return;

            const control = this.getControl(key as keyof T);
            if(control.validator)
            {
                let props: (keyof T)[] = control.validator[CUSTOM_VALIDATOR_SYMBOL];

                if(!props)
                    props = [];

                props.forEach(p =>
                {
                    this.markAsDependent(p, key as keyof T, extras.markDependentAsDirty);
                });
            }
        });
    }

    private initControl(definition: FormGroupDefinition<T>[keyof T], controls: Record<keyof T, AbstractControl>, k: string)
    {
        let obs: Observable<boolean>[] = [];
        let joiner: DisabledWhenMultipleFields<any>['joiner'] = v => v.some(x => x);

        if(definition.disabledWhen)
        {
            if(isObservable(definition.disabledWhen))
                obs = [definition.disabledWhen];
            else
            {
                const disableWhenConditions: IDisabledWhenField<T>[] = [];
                if(!isDisabledWhenMultipleFields(definition.disabledWhen))
                    disableWhenConditions.push(definition.disabledWhen);
                else
                {
                    disableWhenConditions.push(...definition.disabledWhen.conditions);
                    joiner = definition.disabledWhen.joiner ?? joiner;
                }

                obs = disableWhenConditions.map(d =>
                    controls[d.name].valueChanges.pipe(
                        startWith(controls[d.name].value),
                        d.operator,
                        distinctUntilChanged()
                    ));
            }
        }

        const control = controls[k as keyof T];
        combineLatest([
            this.extraComplete.disabledWhen$!.pipe(distinctUntilChanged()),
            ...obs
        ]).subscribe(([formDisabled, ...controlDisabled]) =>
        {
            if(joiner(controlDisabled) || formDisabled)
                control.disable();
            else
                control.enable();
        });
    }

    private buildDefaultExtras(extra?: Partial<FormDefinitionExtras> | null): FormDefinitionExtras
    {
        const completeExtras = {} as FormDefinitionExtras;

        if(extra && extra.validator)
            completeExtras.validator = _c => this.group ? extra.validator(this.group) : null;

        if(extra && extra.disabledWhen$)
            completeExtras.disabledWhen$ = extra.disabledWhen$;
        else
            completeExtras.validator = null;

        if(extra && extra.asyncValidator)
            completeExtras.asyncValidator = _c => this.group ? extra.asyncValidator(this.group) : of(null);
        else
            completeExtras.asyncValidator = null;

        completeExtras.autoMarkAsDependents = extra && extra.hasOwnProperty('autoMarkAsDependents') ? !!extra.autoMarkAsDependents : true;
        completeExtras.markDependentAsDirty = extra && extra.hasOwnProperty('markDependentAsDirty') ? !!extra.markDependentAsDirty : true;

        if(extra)
            completeExtras.disabledWhen$ = extra.disabledWhen$;

        if(!completeExtras.disabledWhen$)
            completeExtras.disabledWhen$ = of(false);

        return completeExtras;
    }

    private computeSelectModels(): string[]
    {
        return Object.keys(this.formDefinition).filter(k =>
        {
            const def = this.formDefinition[k];
            return !!def.select;
        });
    }

    private createControl(v: FormDefinition<any> | FormArrayDefinition<any>): AbstractControl
    {
        if(isArrayWithCB(v))
            return new FormArrayW(v.initialValue.map(x => FormFacade.buildInnerControlForArray(v, x)), v.validator, v.asyncValidator);
        else
            return new FormControlW(v.initialValue, v.validator, v.asyncValidator);
    }

    private alignFormArrays(values: Partial<T>): void
    {
        Object.keys(values).forEach((kk: string) =>
        {
            const k = kk as keyof T;
            const value = values[kk];
            if(this.formArrayKeys.has(k))
            {
                const valueAsArray = value as unknown as any[];
                const definition = this.formDefinition[k] as Required<FormArrayDefinition<T[typeof k]>> & FormArrayDefinition<any[]>;
                const formArray = this.getControl(k) as unknown as FormArrayW;

                valueAsArray.forEach((arrayItem, index) =>
                {
                    if(formArray.length <= index)
                    {
                        const controlBuilt = FormFacade.buildInnerControlForArray(definition, arrayItem);
                        formArray.push(controlBuilt);
                    }
                });

                while(formArray.length > valueAsArray.length)
                    formArray.removeAt(formArray.length - 1);
            }
        });
    }

    private getWarningsOrErrorsForControl(ctrl: AbstractControl & ControlW, prop: 'errors' | 'warnings'): any
    {
        if(!ctrl) return null;

        if(!(ctrl instanceof FormArrayW))
            return ctrl[prop];

        const suffix = prop === 'errors' ? 'Errors' : 'Warnings';
        const destCtrlProp = `control${suffix}`;
        const destArrayProp = `array${suffix}`;

        const arrayStatus = {} as any;
        if(ctrl[prop])
            arrayStatus[destCtrlProp] = ctrl[prop];

        arrayStatus[destArrayProp] = {};
        ctrl.controls.forEach((control, index) =>
        {
            let propValue;

            if(control instanceof UntypedFormGroup)
            {
                const controlFacade = FormFacade.getFormGroupFacade(control);
                if(controlFacade)
                    propValue = controlFacade[prop];
            }

            if(propValue === undefined)
                propValue = (control as FormControlW)[prop];

            if(propValue)
                arrayStatus[destArrayProp][index] = propValue;
        });

        if(Object.keys(arrayStatus[destArrayProp]).length === 0)
            delete arrayStatus[destArrayProp];

        return Object.keys(arrayStatus).length === 0 ? null : arrayStatus;
    }
}


function isArrayWithCB(v: FormDefinition<any>): v is Required<FormArrayDefinition<any>>
{
    return !!(v as any).controlBuilder;
}

function isDisabledWhenMultipleFields<T>(v: DisabledWhenMultipleFields<T> | IDisabledWhenField<T>): v is DisabledWhenMultipleFields<T>
{
    return v.hasOwnProperty('conditions');
}
