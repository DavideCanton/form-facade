import { find } from 'lodash';

export interface ISelect
{
  id: string;
  name: string;
  category?: string;
}

export class SelectManager
{
  private _values: ISelect[] = [];
  private _selectedId: string | null;

  constructor()
  {
    this.setSelectedId(null);
  }

  get selectedValue(): ISelect | null
  {
    return this.hasSelectedItem ? this.findValue(this.getSelectedId()!) : null;
  }

  get hasSelectedItem(): boolean
  {
    return this.getSelectedId() !== null;
  }

  getValues(): ISelect[]
  {
    return this._values;
  }

  setValues(values: ISelect[])
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
    if(!id || this.findValue(id))
    {
      this._selectedId = id;
      return true;
    }
    return false;
  }

  findValue(id: string): ISelect | null
  {
    return find(this.getValues(), { id }) || null;
  }
}
