import { find } from 'lodash';

export interface ISelectModel
{
  id: string;
  name: string;
  category?: string;
}

export class SelectModelManager
{
  private _values: ISelectModel[] = [];
  private _selectedId: string | null;

  constructor()
  {
    this.setSelectedId(null);
  }

  get selectedValue(): ISelectModel | null
  {
    return this.hasSelectedItem ? this.findValue(this.getSelectedId()!) : null;
  }

  get hasSelectedItem(): boolean
  {
    return this.getSelectedId() !== null;
  }

  getValues(): ISelectModel[]
  {
    return this._values;
  }

  setValues(values: ISelectModel[])
  {
    this._values = values;
  }

  clearValues()
  {
    this.setValues([]);
  }

  getSelectedId(): string | null
  {
    return this._selectedId;
  }

  setSelectedId(id: string | null): boolean
  {
    if (!id || this.findValue(id))
    {
      this._selectedId = id;
      return true;
    }
    return false;
  }

  findValue(id: string): ISelectModel | null
  {
    return find(this.getValues(), { id }) || null;
  }
}
