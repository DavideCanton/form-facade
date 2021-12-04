import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FormFacadeValidators, FormFacade } from '@mdcc/form-facade';

interface I
{
  name: string;
  age: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit
{
  facade: FormFacade<I>;

  ngOnInit()
  {
    this.facade = new FormFacade<I>({
      name: {
        initialValue: ''
      },
      age: {
        initialValue: 0,
        validator: FormFacadeValidators.makeDependentValidator<I>(
          ['name'],
          (ctrl: FormControl) => FormFacade.getFacadeFromChildControl<I>(ctrl)?.getValue('name')?.endsWith('a') ?
            (ctrl?.value > 18 ? null : { error: 'age must be greater than 18 for ending with a' }) :
            (ctrl?.value > 21 ? null : { error: 'age must be greater than 21 for others' })
        )
      }
    });
  }
}
