import { Directive, Input, OnChanges, OnDestroy, TemplateRef, ViewContainerRef, ViewRef } from "@angular/core";
import { FormFacade } from "../classes/form-facade";
import { SelectModelManager } from "../classes/definitions/select-model";

export interface ISelectModelManagerContext
{
    $implicit: SelectModelManager;
}

@Directive({
    selector: '[ffSelectModelManager]',
})
export class SelectModelManagerDirective<T> implements OnChanges, OnDestroy
{
    @Input('ffSelectModelManager') facade: FormFacade<T>;
    @Input('ffSelectModelManagerKey') key: keyof T;
    private viewRef: ViewRef | null = null;

    constructor(
        private container: ViewContainerRef,
        private template: TemplateRef<any>
    ) { }

    get currentView()
    {
        return this.container.get(0);
    }

    ngOnChanges()
    {
        let operation = null;
        let context: ISelectModelManagerContext | null = null;

        if (this.facade && this.key)
        {
            const manager = this.facade.getSelectModel(this.key);

            if (manager)
            {
                operation = this.currentView ? "update" : "create";
                context = { $implicit: manager };
            }
            else
                operation = "destroy";
        }

        switch (operation)
        {
            case "create":
                this.createView(context);
                break;
            case "update":
                this.updateView(context);
                break;
            case "destroy":
                this.destroyView();
        }
    }

    // Make sure the template checker knows the type of the context with which the
    // template of this directive will be rendered
    static ngTemplateContextGuard(dir: SelectModelManagerDirective<any>, ctx: unknown): ctx is ISelectModelManagerContext
    {
        return true;
    }

    ngOnDestroy()
    {
        this.destroyView()
    }

    createView(context: ISelectModelManagerContext)
    {
        this.viewRef = this.container.createEmbeddedView(this.template, context);
    }

    updateView(context: ISelectModelManagerContext)
    {
        this.destroyView();
        this.createView(context);
    }

    destroyView()
    {
        this.viewRef?.destroy()
    }
}