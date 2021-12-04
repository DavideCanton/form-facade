import { NgModule } from "@angular/core";
import { SelectModelManagerDirective } from "./directives/select-model-manager.directive";

@NgModule({
    declarations: [SelectModelManagerDirective],
    exports: [SelectModelManagerDirective],
})
export class FormFacadeModule {}