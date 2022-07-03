export interface Select
{
  id: string;
  name: string;
  category?: string;
}

export class SelectManager
{
  private _values: Select[] = [];
  private _selectedId: string | null;

  constructor()
  {
    this.setSelectedId(null);
  }

  get selectedValue(): Select | null
  {
    return this.hasSelectedItem ? this.findValue(this.getSelectedId()!) : null;
  }

  get hasSelectedItem(): boolean
  {
    return this.getSelectedId() !== null;
  }

  getValues(): Select[]
  {
    return this._values;
  }

  setValues(values: Select[])
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

  findValue(id: string): Select | null
  {
    return this.getValues().find(p => p.id == id) || null;
  }
}
