import {
    Directive,
    Input,
    OnChanges,
    OnDestroy,
    TemplateRef,
    ViewContainerRef,
    ViewRef,
} from '@angular/core';
import { FormFacade } from '../classes/form-facade';
import { SelectManager } from '../classes/definitions/select-model';

export interface SelectModelManagerContext {
    $implicit: SelectManager;
}

@Directive({
    selector: '[ffSelect]',
})
export class SelectDirective<T> implements OnChanges, OnDestroy {
    @Input('ffSelect') facade: FormFacade<T>;
    @Input('ffSelectKey') key: keyof T;
    private viewRef: ViewRef | null = null;

    constructor(private container: ViewContainerRef, private template: TemplateRef<any>) {}

    get currentView() {
        return this.container.get(0);
    }

    // Make sure the template checker knows the type of the context with which the
    // template of this directive will be rendered
    static ngTemplateContextGuard(
        dir: SelectDirective<any>,
        ctx: unknown
    ): ctx is SelectModelManagerContext {
        return true;
    }

    ngOnChanges() {
        let operation = null;
        let context: SelectModelManagerContext | null = null;

        if (this.facade && this.key) {
            const manager = this.facade.getSelectModel(this.key);

            if (manager) {
                operation = this.currentView ? 'update' : 'create';
                context = { $implicit: manager };
            } else operation = 'destroy';
        }

        switch (operation) {
            case 'create':
                this.createView(context);
                break;
            case 'update':
                this.updateView(context);
                break;
            case 'destroy':
                this.destroyView();
        }
    }

    ngOnDestroy() {
        this.destroyView();
    }

    createView(context: SelectModelManagerContext) {
        this.viewRef = this.container.createEmbeddedView(this.template, context);
    }

    updateView(context: SelectModelManagerContext) {
        this.destroyView();
        this.createView(context);
    }

    destroyView() {
        this.viewRef?.destroy();
    }
}
