import { AbstractControl, AsyncValidatorFn, FormArray, FormGroup, ValidatorFn } from '@angular/forms';
import { filter as filter_, forEach, has, isNil, isString, keys, map, mapValues, some, wrap } from 'lodash';
import { combineLatest, isObservable, Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { FormArrayWithWarning, FormControlWithWarning, IControlWithWarning } from './form-control-with-warning';
import * as ifs from './form-group-facade.interfaces';
import { ISelectModel, SelectModelManager } from './select-model';
import { ElementOf } from './type-utils';
import { CUSTOM_VALIDATOR_SYMBOL, IOuterFormPropName } from './validators';

function isFormDefinitionArrayWithControlBuilder(v: ifs.IFormDefinition<any>): v is Required<ifs.IFormArrayDefinition<any>>
{
    return !!(v as any).controlBuilder;
}

function isDisabledWhenMultipleFields<T>(v: ifs.IDisabledWhenMultipleFields<T> | ifs.IDisabledWhenField<T>): v is ifs.IDisabledWhenMultipleFields<T>
{
    return has(v, 'conditions');
}

const FORM_GROUP_FACADE_SYMBOL = Symbol('form-group-facade-ref');

export class FormGroupFacade<T>
{

    private formDefinition: ifs.IFormGroupDefinition<T>;
    private innerGroup: FormGroup;
    private selectModels: Partial<Record<keyof T, SelectModelManager>>;
    private formArrayKeys = new Set<keyof T>();
    private extraComplete: ifs.IFormDefinitionExtras;

    get group(): FormGroup
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
        return keys(this.formDefinition) as (keyof T)[];
    }

    get hasWarnings(): boolean
    {
        return !!this.warnings;
    }

    get warnings(): ifs.IFormErrors<T> | null
    {
        const warnings = {} as ifs.IFormErrors<T>;

        forEach(keys(this.formDefinition), k =>
        {
            const ctrl = this.getControl(k as keyof T);
            const controlWarnings = this.getWarningsOrErrorsForControl(ctrl, 'warnings');
            if(controlWarnings)
                warnings[k] = controlWarnings;
        });

        return keys(warnings).length > 0 ? warnings : null;
    }

    get errors(): ifs.IFormErrors<T> | null
    {
        const errors = {} as ifs.IFormErrors<T>;

        if(this.group.errors)
            errors.groupErrors = this.group.errors;

        forEach(keys(this.formDefinition), k =>
        {
            const ctrl = this.getControl(k as keyof T);
            const controlErrors = this.getWarningsOrErrorsForControl(ctrl, 'errors');
            if(controlErrors)
                errors[k] = controlErrors;
        });

        return keys(errors).length > 0 ? errors : null;
    }

    static getFormGroupFacade<T>(group: FormGroup): FormGroupFacade<T> | null
    {
        return group[FORM_GROUP_FACADE_SYMBOL] || null;
    }

    static buildFacadeFrom<T>(formDefinition: ifs.IFormGroupDefinition<T>, extra?: Partial<ifs.IFormDefinitionExtras> | null): FormGroupFacade<T>
    {
        const facade = new FormGroupFacade<T>();
        facade.buildFrom(formDefinition, extra);
        return facade;
    }

    private static buildInnerControlForArray<T>(v: Required<ifs.IFormArrayDefinition<T>>, x: ElementOf<T>): AbstractControl
    {
        const defOrControl = v.controlBuilder();
        if(defOrControl instanceof AbstractControl)
        {
            defOrControl.reset(x);
            return defOrControl;
        }

        const facade = FormGroupFacade.buildFacadeFrom(defOrControl);
        facade.reset(x);
        return facade.group;
    }

    buildFrom(def: ifs.IFormGroupDefinition<T>, extra?: Partial<ifs.IFormDefinitionExtras> | null)
    {
        this.formDefinition = def;

        this.extraComplete = this.buildDefaultExtras(extra);

        const values: Record<keyof T, AbstractControl> =
            mapValues<ifs.IFormGroupDefinition<T>, AbstractControl>(
                def,
                (value: any, key: any) =>
                {
                    const valueCast = value as ifs.IFormDefinition<any> | ifs.IFormArrayDefinition<any>;
                    const control = this.createControl(valueCast);
                    if(control instanceof FormArrayWithWarning)
                        this.formArrayKeys.add(key as keyof T);
                    return control;
                }
            );

        this.innerGroup = new FormGroup(values, this.extraComplete.validator, this.extraComplete.asyncValidator);
        this.innerGroup[FORM_GROUP_FACADE_SYMBOL] = this;

        this.selectModels = {};
        const selectModelKeys = this.computeSelectModels();

        selectModelKeys.forEach(k =>
        {
            const modelManager = this.selectModels[k] = new SelectModelManager();
            modelManager.setValues(this.formDefinition[k].select);
            this.group.get(k)!.valueChanges.subscribe(v => modelManager.setSelectedId(v));
            if(!isNil(this.formDefinition[k as keyof T].initialValue))
                modelManager.setSelectedId(this.formDefinition[k].initialValue as any);
        });

        forEach(def, (v, k) =>
        {
            this.initControl(v, values, k);
        });

        if(this.extraComplete.autoMarkAsDependents)
            this.markDependents(this.extraComplete);
    }

    getValues(includeDisabledFields = false): Partial<T>
    {
        if(!includeDisabledFields)
            return this.group.value;
        else
            return this.group.getRawValue();
    }

    updateValidators(def: ifs.IFormGroupValidatorDefinition<T>, fireValidators = false)
    {
        keys(def).forEach(k =>
        {
            const key = k as keyof T;
            const vDef = def[key];
            if(!vDef) return;

            const control = this.getControl(key);
            if(vDef.validator)
            {
                if(control.validator) throw new Error(`Validators overridden for control ${key}`);
                control.setValidators(vDef.validator);
            }
            if(vDef.asyncValidator)
            {
                if(control.asyncValidator) throw new Error(`Async validators overridden for control ${key}`);
                control.setAsyncValidators(vDef.asyncValidator);
            }
        });

        if(this.extraComplete.autoMarkAsDependents)
            this.markDependents(this.extraComplete, keys(def) as (keyof T)[]);

        if(fireValidators)
            this.revalidate();
    }

    getControl<K extends keyof T>(key: K): FormControlWithWarning | FormArrayWithWarning
    {
        return this.group.get(key as string)! as FormControlWithWarning | FormArrayWithWarning;
    }

    hasControl(key: string): boolean
    {
        return !!this.group.get(key);
    }

    getValue<K extends keyof T>(key: K): T[K]
    {
        return this.getControl(key).value;
    }

    patchValues(values: Partial<T>, options?: { onlySelf?: boolean; emitEvent?: boolean; })
    {
        this.alignFormArrays(values);
        this.group.patchValue(values, options);
        if(options && !options.emitEvent)
        {
            forEach(values, (v, k) =>
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
        return mapValues(this.formDefinition, d => d.initialValue) as T;
    }

    revalidate()
    {
        forEach(this.formDefinition, (_def, key) =>
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

    getSelectModel(key: keyof T): SelectModelManager | null
    {
        const m = this.selectModels[key] as SelectModelManager | undefined;
        return m || null;
    }

    getSelectValues(key: keyof T): ISelectModel[] | null
    {
        const model = this.getSelectModel(key);
        return model ? model.getValues() : null;
    }

    getSelectValue(key: keyof T): ISelectModel | null
    {
        const model = this.getSelectModel(key);
        return model ? model.selectedValue : null;
    }

    markAsDependent(key1: keyof T | AbstractControl, key2: keyof T, markAsDirty = true)
    {
        (key1 instanceof AbstractControl ? key1 : this.getControl(key1)).valueChanges.pipe(
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
        forEach(keys(this.formDefinition), k =>
        {
            const control = this.getControl(k as keyof ifs.IFormGroupDefinition<T>);
            control.markAsPristine({ onlySelf: true });
            control.markAsUntouched({ onlySelf: true });
            control.updateValueAndValidity();
        });
    }

    markAsDirty(onlyInvalid = true)
    {
        forEach(keys(this.formDefinition), k =>
        {
            const control = this.getControl(k as keyof ifs.IFormGroupDefinition<T>);
            if(!onlyInvalid || control.invalid)
            {
                if(control instanceof FormArray)
                {
                    forEach(control.controls, childControl =>
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
        forEach(keys(this.formDefinition), k =>
        {
            const control = this.getControl(k as keyof ifs.IFormGroupDefinition<T>);
            queue.push(control);
        });

        while(queue.length > 0)
        {
            const control = queue.pop()!;
            if(!onlyInvalid || control.invalid)
            {
                if(control instanceof FormArray || control instanceof FormGroup)
                {
                    forEach(control.controls, (childControl: AbstractControl) =>
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

    // tslint:disable-next-line: ban-types
    private ensureGroupIsCreated<T>(func: (g: FormGroup) => T): (g: FormGroup) => T
    {
        return wrap(func, oldFn =>
        {
            return this.group ? oldFn(this.group) : null;
        });
    }

    private markDependents(extras: ifs.IFormDefinitionExtras, keysToUpdate: (keyof T)[] | null = null)
    {
        forEach(this.formDefinition, (_d: any, key) =>
        {
            if(keysToUpdate !== null && !keysToUpdate.includes(key as keyof T))
                return;

            const control = this.getControl(key as keyof T);
            if(control.validator)
            {
                let props: (keyof T | IOuterFormPropName<any, any>)[] = control.validator[CUSTOM_VALIDATOR_SYMBOL];

                if(!props)
                    props = [];

                forEach(props, p =>
                {
                    let param: keyof T | AbstractControl;
                    if(isString(p))
                        param = p as keyof T;
                    else
                    {
                        const outerForm = p as IOuterFormPropName<any, any>;
                        param = outerForm.facade.getControl(outerForm.propName);
                    }

                    this.markAsDependent(param, key as keyof T, extras.markDependentAsDirty);
                });
            }
        });
    }

    private initControl(definition: ifs.IFormGroupDefinition<T>[keyof T], controls: Record<keyof T, AbstractControl>, k: string)
    {
        let obs: Observable<boolean>[] = [];
        let joinFn = some;

        if(definition.disabledWhen)
        {
            if(isObservable(definition.disabledWhen))
                obs = [definition.disabledWhen];
            else
            {
                const disableWhenConditions: ifs.IDisabledWhenField<T>[] = [];
                if(!isDisabledWhenMultipleFields(definition.disabledWhen))
                    disableWhenConditions.push(definition.disabledWhen);
                else
                {
                    disableWhenConditions.push(...definition.disabledWhen.conditions);
                    joinFn = definition.disabledWhen.joinFn || joinFn;
                }

                obs = map(disableWhenConditions, d =>
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
            if(joinFn(controlDisabled) || formDisabled)
                control.disable();
            else
                control.enable();
        });
    }

    private buildDefaultExtras(extra?: Partial<ifs.IFormDefinitionExtras> | null): ifs.IFormDefinitionExtras
    {
        const completeExtras = {} as ifs.IFormDefinitionExtras;

        if(extra && extra.validator)
            completeExtras.validator = this.ensureGroupIsCreated<ValidatorFn>(extra.validator);
        else
            completeExtras.validator = null;

        if(extra && extra.asyncValidator)
            completeExtras.asyncValidator = this.ensureGroupIsCreated<AsyncValidatorFn>(extra.asyncValidator);
        else
            completeExtras.asyncValidator = null;

        completeExtras.autoMarkAsDependents = extra && has(extra, 'autoMarkAsDependents') ? !!extra.autoMarkAsDependents : true;
        completeExtras.markDependentAsDirty = extra && has(extra, 'markDependentAsDirty') ? !!extra.markDependentAsDirty : true;

        if(extra)
            completeExtras.disabledWhen$ = extra.disabledWhen$;

        if(!completeExtras.disabledWhen$)
            completeExtras.disabledWhen$ = of(false);

        return completeExtras;
    }

    private computeSelectModels(): string[]
    {
        const ks = keys(this.formDefinition);

        return filter_(ks, (k: string) =>
        {
            const def = this.formDefinition[k];
            return !!def.select;
        });
    }

    private createControl(v: ifs.IFormDefinition<any> | ifs.IFormArrayDefinition<any>): AbstractControl
    {
        if(isFormDefinitionArrayWithControlBuilder(v))
            return new FormArrayWithWarning(map(v.initialValue, x => FormGroupFacade.buildInnerControlForArray(v, x)), v.validator, v.asyncValidator);
        else
            return new FormControlWithWarning(v.initialValue, v.validator, v.asyncValidator);
    }

    private alignFormArrays(values: Partial<T>): void
    {
        forEach(values, <K extends keyof T>(value: T[K], k: string) =>
        {
            if(this.formArrayKeys.has(k as K))
            {
                const valueAsArray = value as unknown as any[];
                const definition = this.formDefinition[k] as Required<ifs.IFormArrayDefinition<T[K]>>;
                const formArray = this.getControl(k as keyof T) as unknown as FormArrayWithWarning;

                forEach(valueAsArray, (arrayItem, index) =>
                {
                    if(formArray.length <= index)
                    {
                        const controlBuilt = FormGroupFacade.buildInnerControlForArray(definition, arrayItem);
                        formArray.push(controlBuilt);
                    }
                });

                while(formArray.length > valueAsArray.length)
                    formArray.removeAt(formArray.length - 1);
            }
        });
    }

    private getWarningsOrErrorsForControl(ctrl: AbstractControl & IControlWithWarning, prop: 'errors' | 'warnings'): any
    {
        if(!ctrl) return null;

        if(!(ctrl instanceof FormArrayWithWarning))
            return ctrl[prop];

        const suffix = prop === 'errors' ? 'Errors' : 'Warnings';
        const destCtrlProp = `control${suffix}`;
        const destArrayProp = `array${suffix}`;

        const arrayStatus = {} as any;
        if(ctrl[prop])
            arrayStatus[destCtrlProp] = ctrl[prop];

        arrayStatus[destArrayProp] = {};
        forEach(ctrl.controls, (control, index) =>
        {
            let propValue;

            if(control instanceof FormGroup)
            {
                const controlFacade = FormGroupFacade.getFormGroupFacade(control);
                if(controlFacade)
                    propValue = controlFacade[prop];
            }

            if(propValue === undefined)
                propValue = (control as FormControlWithWarning)[prop];

            if(propValue)
                arrayStatus[destArrayProp][index] = propValue;
        });

        if(keys(arrayStatus[destArrayProp]).length === 0)
            delete arrayStatus[destArrayProp];

        return keys(arrayStatus).length === 0 ? null : arrayStatus;
    }
}
