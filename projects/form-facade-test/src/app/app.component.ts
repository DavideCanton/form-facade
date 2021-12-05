import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { FormFacadeValidators, FormFacade } from '@mdcc/form-facade';
import { filter } from 'rxjs/operators';

interface I
{
  name: string;
  age: number | null;
  selectSex: boolean;
  sex: 'M' | 'F' | null;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit
{
  facade: FormFacade<I>;

  ngOnInit()
  {
    this.facade = new FormFacade<I>({
      name: {
        initialValue: '',
        validator: Validators.required
      },
      age: {
        initialValue: null,
        validator: FormFacadeValidators.composeValidators([
          Validators.required,
          Validators.min(1),
          FormFacadeValidators.makeDependentValidator<I>(
            ['sex'],
            (ctrl: FormControl) =>
            {
              const sex = FormFacade.getFacadeFromChildControl<I>(ctrl)?.getValue('sex');
              if(!sex) return null;

              return sex === 'F' ?
                Validators.min(18)(ctrl) :
                Validators.min(21)(ctrl);
            }
          )
        ])
      },
      selectSex: {
        initialValue: false
      },
      sex: {
        initialValue: null,
        select: [
          { id: 'M', name: 'M' },
          { id: 'F', name: 'F' },
        ],
        validator: FormFacadeValidators.conditionalRequired(
          { propName: 'selectSex', value: true },
        )
      }
    });

    this.facade.getControl('selectSex').valueChanges.pipe(
      filter(v => !v)
    ).subscribe(() => this.facade.patchValues({
      sex: null
    }));
  }
}
