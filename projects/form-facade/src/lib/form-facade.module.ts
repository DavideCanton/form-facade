import { NgModule } from '@angular/core';
import { SelectDirective } from './directives/select.directive';

@NgModule({
    declarations: [SelectDirective],
    exports: [SelectDirective],
})
export class FormFacadeModule {}
