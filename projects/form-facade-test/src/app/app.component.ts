import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { composeValidators, FormFacade, makeDependentValidator } from '@mdcc/form-facade';
import { filter } from 'rxjs/operators';

interface Form
{
    name: string;
    age: number | null;
    selectSex: boolean;
    sex: 'M' | 'F' | null;
}

const v18 = Validators.min(18);
const v21 = Validators.min(21);

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit
{
    facade: FormFacade<Form>;

    ngOnInit()
    {
        this.facade = new FormFacade<Form>({
            name: {
                initialValue: '',
                validator: Validators.required
            },
            age: {
                initialValue: null,
                validator: composeValidators([
                    Validators.required,
                    Validators.min(1),
                    makeDependentValidator<Form>()(
                        'sex',
                        (ctrl, { sex }) => (sex === 'F' ? v18 : v21)(ctrl)
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
                validator: makeDependentValidator<Form>()(
                    'selectSex',
                    (ctrl, { selectSex }) => selectSex ? Validators.required(ctrl) : null
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
