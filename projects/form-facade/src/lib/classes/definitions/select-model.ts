export interface Select
{
    id: string;
    name: string;
    category?: string;
}

export class SelectManager
{
    private _values: Select[] = [];
    private _selectedIds = new Set<string>();

    constructor(private multiple = false)
    {
    }

    get selectedValue(): Select | null
    {
        const id = this.selectedId;
        return this._values.find(t => t.id == id) ?? null;
    }

    get selectedValues(): Select[]
    {
        return this._values.filter(t => this._selectedIds.has(t.id));
    }

    get selectedId(): string | null
    {
        if(this.multiple)
            throw new Error('Cannot get selectedId with a multiple select');

        return this.selectedIds?.[0] ?? null;
    }

    get selectedIds(): string[]
    {
        return [...this._selectedIds];
    }

    get hasSelectedItem(): boolean
    {
        return this._selectedIds.size > 0;
    }

    get values(): Select[]
    {
        return this._values;
    }

    set selectedId(id: string | null)
    {
        if(this.multiple)
            throw new Error('Cannot set selectedId with a multiple select');
        this.selectedIds = id !== null ? [id] : [];
    }

    set selectedIds(ids: string[])
    {
        if(ids.length > 1 && !this.multiple)
            throw new Error('Cannot set multiple selected ids in a non multiple select');

        const nonexisting = ids.filter(id => !this._values.some(t => t.id == id));

        if(nonexisting.length > 0)
            throw new Error('Some elements are not in the select list: ' + nonexisting);

        this._selectedIds = new Set(ids);
    }

    set values(values: Select[])
    {
        this._values = values;
        this._selectedIds.clear();
    }

    clearValues()
    {
        this.values = [];
    }

    findValue(id: string): Select | null
    {
        return this.values.find(p => p.id == id) || null;
    }
}
