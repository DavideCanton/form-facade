import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { combineLatest, isObservable, Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';

import { forEachObject, mapValues } from '../classes/utils/object-utils';
import * as I from './definitions/form-group-facade.interfaces';
import { Select, SelectManager } from './definitions/select-model';
import { ControlW, FormArrayW, FormControlW, FormGroupW } from './form-control-w';

const FORM_GROUP_FACADE_SYMBOL = Symbol('form-group-facade-ref');

export class FormFacade<T> {
    private innerGroup: FormGroupW;
    private selectModels: { [K in keyof T]?: SelectManager };
    private formArrayKeys = new Set<keyof T>();
    private extra: I.FormDefinitionExtras;

    constructor(
        private formDefinition: I.FormGroupDefinition<T>,
        extra?: Partial<I.FormDefinitionExtras> | null
    ) {
        this.extra = this.buildDefaultExtras(extra);

        const values = mapValues(formDefinition, (def, key) => {
            const control = this.createControl(def);
            if (control instanceof FormArrayW) this.formArrayKeys.add(key);
            return control;
        });

        this.innerGroup = new FormGroupW(values, this.extra.validator, this.extra.asyncValidator);
        this.innerGroup[FORM_GROUP_FACADE_SYMBOL] = this;

        this.computeSelectModels();

        forEachObject(formDefinition, (v, k) => {
            this.initControl(v, values, k);
        });

        if (this.extra.autoMarkAsDependents) this.markDependents(this.extra);
    }

    get group(): FormGroupW {
        return this.innerGroup;
    }

    get dirty(): boolean {
        return this.group.dirty;
    }

    get pristine(): boolean {
        return this.group.pristine;
    }

    get valid(): boolean {
        return this.group.valid;
    }

    get invalid(): boolean {
        return this.group.invalid;
    }

    get hasWarnings(): boolean {
        return (
            this.group.hasWarnings ||
            Object.values(this.group.controls).some((c: ControlW) => c.hasWarnings)
        );
    }

    get keys(): (keyof T)[] {
        return Object.keys(this.formDefinition) as (keyof T)[];
    }

    static getFormGroupFacade<T>(group: FormGroup): FormFacade<T> | null {
        return group[FORM_GROUP_FACADE_SYMBOL] || null;
    }

    static getFacadeFromChild<T>(child: AbstractControl): FormFacade<T> | null {
        while (child) {
            if (child instanceof FormGroup) {
                const ff = FormFacade.getFormGroupFacade<T>(child);
                if (ff) return ff;
            }
            child = child.parent;
        }
        return null;
    }

    getValues(includeDisabledFields = false): Partial<T> {
        if (!includeDisabledFields) return this.group.value;
        else return this.group.getRawValue();
    }

    updateValidators(def: I.FormGroupValidatorDefinition<T>, fireValidators = false) {
        forEachObject(def, (vDef, key) => {
            if (!vDef) return;
            const keyS = String(key);

            const control = this.getControl(key);
            if (vDef.validator) {
                if (control.validator) throw new Error(`Validators overridden for control ${keyS}`);
                control.setValidators(vDef.validator);
            }
            if (vDef.asyncValidator) {
                if (control.asyncValidator)
                    throw new Error(`Async validators overridden for control ${keyS}`);
                control.setAsyncValidators(vDef.asyncValidator);
            }
        });

        if (this.extra.autoMarkAsDependents)
            this.markDependents(this.extra, Object.keys(def) as (keyof T)[]);

        if (fireValidators) this.revalidate();
    }

    getControl<K extends keyof T>(key: K): FormControlW | FormArrayW {
        return this.group.get(key as string)! as FormControlW | FormArrayW;
    }

    getArray<K extends I.Ks<T>>(key: K): FormArrayW {
        const ctrl = this.getControl(key);
        if (!(ctrl instanceof FormArrayW))
            throw new Error(`Control with name ${key} is not a FormArray`);
        return ctrl;
    }

    getSimpleControl<K extends I.Ks<T>>(key: K): FormControlW {
        const ctrl = this.getControl(key);
        if (!(ctrl instanceof FormControlW))
            throw new Error(`Control with name ${key} is not a FormControl`);
        return ctrl;
    }

    hasControl(key: string): boolean {
        return !!this.group.get(key);
    }

    getValue<K extends keyof T>(key: K): T[K] {
        return this.getControl(key).value;
    }

    patchValues(values: Partial<T>, options?: { onlySelf?: boolean; emitEvent?: boolean }) {
        this.alignFormArrays(values);
        this.group.patchValue(values, options);
        if (options && !options.emitEvent) {
            forEachObject(values, (v, k) => {
                const manager = this.getSelectModel(k);
                if (manager) manager.selectedId = v as any;
            });
        }
    }

    resetInitialValue() {
        this.reset(this.getInitialValues());
    }

    getInitialValues(): T {
        return Object.keys(this.formDefinition).reduce(
            (acc, k) => ({
                ...acc,
                [k]: this.formDefinition[k].initialValue,
            }),
            {}
        ) as T;
    }

    revalidate() {
        Object.keys(this.formDefinition).forEach(key => {
            this.getControl(key as keyof T).updateValueAndValidity({
                onlySelf: true,
            });
        });
        this.group.updateValueAndValidity();
    }

    setValues(values: T) {
        this.alignFormArrays(values);
        this.group.setValue(values);
    }

    reset(values?: Partial<T>) {
        if (values) this.alignFormArrays(values);
        this.group.reset(values);
    }

    getSelectModel(key: keyof T): SelectManager | null {
        const m = this.selectModels[key] as SelectManager | undefined;
        return m || null;
    }

    getSelectValues(key: keyof T): Select[] | null {
        return this.getSelectModel(key)?.values ?? null;
    }

    getSelectValue(key: keyof T): Select | null {
        return this.getSelectModel(key)?.selectedValue;
    }

    markAsDependent(key1: keyof T, key2: keyof T, markAsDirty = true) {
        this.getControl(key1)
            .valueChanges.pipe(distinctUntilChanged(), debounceTime(0))
            .subscribe(() => {
                const ctrl = this.getControl(key2);
                ctrl.updateValueAndValidity();
                if (markAsDirty) ctrl.markAsDirty();
            });
    }

    restorePristineState() {
        Object.keys(this.formDefinition).forEach(k => {
            const control = this.getControl(k as keyof I.FormGroupDefinition<T>);
            control.markAsPristine({ onlySelf: true });
            control.markAsUntouched({ onlySelf: true });
            control.updateValueAndValidity();
        });
    }

    markAsDirty(onlyInvalid = true) {
        Object.keys(this.formDefinition).forEach(k => {
            const control = this.getControl(k as keyof I.FormGroupDefinition<T>);
            if (!onlyInvalid || control.invalid) {
                if (control instanceof FormArray) {
                    control.controls.forEach(childControl => {
                        childControl.markAsDirty({ onlySelf: true });
                        childControl.markAsTouched({ onlySelf: true });
                        childControl.updateValueAndValidity({
                            emitEvent: false,
                            onlySelf: true,
                        });
                    });
                }

                control.markAsDirty({ onlySelf: true });
                control.markAsTouched({ onlySelf: true });
                control.updateValueAndValidity();
            }
        });
    }

    markAsDirtyRecursive(onlyInvalid = true) {
        const queue: AbstractControl[] = [];
        Object.keys(this.formDefinition).forEach(k => {
            const control = this.getControl(k as keyof I.FormGroupDefinition<T>);
            queue.push(control);
        });

        while (queue.length > 0) {
            const control = queue.pop()!;
            if (!onlyInvalid || control.invalid) {
                if (control instanceof FormArray || control instanceof FormGroup) {
                    const controls =
                        control instanceof FormArray
                            ? control.controls
                            : Object.values(control.controls);

                    controls.forEach((childControl: AbstractControl) => {
                        childControl.markAsDirty({ onlySelf: true });
                        childControl.markAsTouched({ onlySelf: true });
                        childControl.updateValueAndValidity({
                            emitEvent: false,
                            onlySelf: true,
                        });
                        queue.push(childControl);
                    });
                }

                control.markAsDirty({ onlySelf: true });
                control.markAsTouched({ onlySelf: true });
                control.updateValueAndValidity();
            }
        }
    }

    private buildInnerControlForArray<K extends keyof T>(
        v: I.FormArrayDefinition<T, K>,
        x: T
    ): AbstractControl {
        const defOrControl = v.controlBuilder();
        if (defOrControl instanceof AbstractControl) {
            defOrControl.reset(x);
            return defOrControl;
        }

        const facade = new FormFacade(defOrControl);
        facade.reset(x);
        return facade.group;
    }

    private markDependents(
        extras: I.FormDefinitionExtras,
        keysToUpdate: (keyof T)[] | null = null
    ) {
        Object.keys(this.formDefinition).forEach(key => {
            if (keysToUpdate !== null && !keysToUpdate.includes(key as keyof T)) return;

            const control = this.getControl(key as keyof T);
            if (control.validator) {
                let props: (keyof T)[] = control.validator[I.CUSTOM_VALIDATOR_SYMBOL];

                if (!props) props = [];

                props.forEach(p => {
                    this.markAsDependent(p, key as keyof T, extras.markDependentAsDirty);
                });
            }
        });
    }

    private initControl<K extends I.Ks<T>>(
        definition: I.FormGroupDefinition<T>[K],
        controls: Record<I.Ks<T>, AbstractControl>,
        k: K
    ) {
        let obs: Observable<boolean>[] = [];
        let joiner: I.DisabledWhenMultipleFields<any>['joiner'] = v => v.some(x => x);

        if (definition.disabledWhen) {
            if (isObservable(definition.disabledWhen)) obs = [definition.disabledWhen];
            else {
                const disableWhenConditions: I.IDisabledWhenField<T>[] = [];
                if (!isDisabledWhenMultipleFields(definition.disabledWhen))
                    disableWhenConditions.push(definition.disabledWhen);
                else {
                    disableWhenConditions.push(...definition.disabledWhen.conditions);
                    joiner = definition.disabledWhen.joiner ?? joiner;
                }

                obs = disableWhenConditions.map(d =>
                    controls[d.name].valueChanges.pipe(
                        startWith(controls[d.name].value),
                        d.operator,
                        distinctUntilChanged()
                    )
                );
            }
        }

        const control = controls[k as I.Ks<T>];
        combineLatest([this.extra.disabledWhen$!.pipe(distinctUntilChanged()), ...obs]).subscribe(
            ([formDisabled, ...controlDisabled]) => {
                if (joiner(controlDisabled) || formDisabled) control.disable();
                else control.enable();
            }
        );
    }

    private buildDefaultExtras(
        extra?: Partial<I.FormDefinitionExtras> | null
    ): I.FormDefinitionExtras {
        const completeExtras = {} as I.FormDefinitionExtras;

        if (extra && extra.validator)
            completeExtras.validator = _c => (this.group ? extra.validator(this.group) : null);

        if (extra && extra.disabledWhen$) completeExtras.disabledWhen$ = extra.disabledWhen$;
        else completeExtras.validator = null;

        if (extra && extra.asyncValidator)
            completeExtras.asyncValidator = _c =>
                this.group ? extra.asyncValidator(this.group) : of(null);
        else completeExtras.asyncValidator = null;

        completeExtras.autoMarkAsDependents =
            extra && extra.hasOwnProperty('autoMarkAsDependents')
                ? !!extra.autoMarkAsDependents
                : true;
        completeExtras.markDependentAsDirty =
            extra && extra.hasOwnProperty('markDependentAsDirty')
                ? !!extra.markDependentAsDirty
                : true;

        if (extra) completeExtras.disabledWhen$ = extra.disabledWhen$;

        if (!completeExtras.disabledWhen$) completeExtras.disabledWhen$ = of(false);

        return completeExtras;
    }

    private computeSelectModels(): void {
        this.selectModels = {};

        const selectModelKeys = Object.keys(this.formDefinition).filter(
            k => this.formDefinition[k].select
        );

        selectModelKeys.forEach(k => {
            const modelManager = (this.selectModels[k] = new SelectManager());
            modelManager.values = this.formDefinition[k].select;

            this.group.get(k)!.valueChanges.subscribe(v => {
                modelManager.selectedId = v;
            });

            const initialValue = this.formDefinition[k as keyof T].initialValue;
            if (initialValue != null)
                modelManager.selectedId = this.formDefinition[k].initialValue as any;
        });
    }

    private createControl<K extends keyof T>(
        def: I.FormDefinition<T, K> | I.FormArrayDefinition<T, K>
    ): AbstractControl {
        if (isArrayWithCB(def)) {
            const arrayIv = def.initialValue as unknown as any[];
            return new FormArrayW(
                arrayIv.map(x => this.buildInnerControlForArray(def, x)),
                def.validator,
                def.asyncValidator
            );
        } else return new FormControlW(def.initialValue, def.validator, def.asyncValidator);
    }

    private alignFormArrays(values: Partial<T>): void {
        forEachObject(values, (value, k) => {
            if (this.formArrayKeys.has(k)) {
                const valueAsArray = value as unknown as any[];
                const definition = this.formDefinition[k] as I.FormArrayDefinition<T, typeof k>;
                const formArray = this.getArray(k);

                valueAsArray.forEach((arrayItem, index) => {
                    if (formArray.length <= index) {
                        const controlBuilt = this.buildInnerControlForArray(definition, arrayItem);
                        formArray.push(controlBuilt);
                    }
                });

                while (formArray.length > valueAsArray.length)
                    formArray.removeAt(formArray.length - 1);
            }
        });
    }
}

function isArrayWithCB<T, K extends keyof T>(
    v: I.FormDefinition<T, K>
): v is I.FormArrayDefinition<T, K> {
    return !!(v as any).controlBuilder;
}

function isDisabledWhenMultipleFields<T>(
    v: I.DisabledWhenMultipleFields<T> | I.IDisabledWhenField<T>
): v is I.DisabledWhenMultipleFields<T> {
    return v.hasOwnProperty('conditions');
}
