import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormFacadeModule } from '@mdcc/form-facade';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormFacadeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
