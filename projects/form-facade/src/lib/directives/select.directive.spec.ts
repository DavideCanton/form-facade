import { ReactiveFormsModule } from '@angular/forms';
import { createDirectiveFactory, SpectatorDirective } from '@ngneat/spectator';
import { FormFacade } from 'projects/form-facade/src/public_api';
import { SelectDirective } from './select.directive';

const template = `
  <form [formGroup]="facade.group">
    <select *ffSelect="facade; key: 'value'; let manager"
            formControlName="value">
      <option *ngFor="let option of manager.getValues()"
              [value]="option.id">
              {{option.name}}
      </option>
    </select>
  </form>
`;

interface F
{
  value: string;
}

describe('SelectModelManagerDirective', () =>
{
  let spectator: SpectatorDirective<SelectDirective<F>>;
  let facade: FormFacade<F>;
  const factory = createDirectiveFactory<SelectDirective<F>>({
    directive: SelectDirective,
    imports: [ReactiveFormsModule],
  });

  beforeEach(() =>
  {
    facade = new FormFacade<F>({
      value: {
        initialValue: null,
        select: [
          { id: '1', name: 'one' },
          { id: '2', name: 'two' },
        ]
      }
    });

    spectator = factory(template, { hostProps: { facade } });
  });

  it('should bind correctly options', () =>
  {
    const options = spectator.queryAll('option');
    expect(options.length).toBe(2);
    expect(options[0].textContent.trim()).toBe('one');
    expect(options[1].textContent.trim()).toBe('two');
  });

  it('should bind correctly value when selected from code', () =>
  {
    const select = spectator.query('select') as HTMLSelectElement;
    expect(facade.getValue('value')).toBe(null);
    expect(select.value).toBe('');
    facade.patchValues({ value: '1' });
    expect(facade.getValue('value')).toBe('1');
    expect(select.value).toBe('1');
  });

  it('should bind correctly value when selected from ui', () =>
  {
    const select = spectator.query('select') as HTMLSelectElement;
    expect(facade.getValue('value')).toBe(null);
    expect(select.value).toBe('');
    select.value = '1';
    spectator.triggerEventHandler('select', 'change', { target: select });
    expect(facade.getValue('value')).toBe('1');
    expect(select.value).toBe('1');
  });
});
