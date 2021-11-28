import { Component, OnInit } from '@angular/core';
import { FormFacadeValidators, FormGroupFacade } from '@davidecanton/form-facade';

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
  facade: FormGroupFacade<I>;

  ngOnInit()
  {
    this.facade = new FormGroupFacade<I>({
      name: {
        initialValue: ''
      },
      age: {
        initialValue: 0,
        validator: FormFacadeValidators.makeDependentValidator<I>(
          ['name'],
          ctrl => FormGroupFacade.getFacadeFromChildControl<I>(ctrl)?.getValue('name')?.endsWith('a') ?
            (ctrl?.value > 18 ? null : { error: 'age must be greater than 18 for ending with a' }) :
            (ctrl?.value > 21 ? null : { error: 'age must be greater than 21 for others' })
        )
      }
    });
  }
}
