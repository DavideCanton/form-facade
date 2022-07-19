import { SelectManager } from './select-model';

describe('SelectManager', () => {
    it('should work with multiple = false', () => {
        const manager = new SelectManager(false);

        expect(manager.values).toEqual([]);
        expect(manager.selectedId).toBeNull();
        expect(manager.selectedValue).toBeNull();

        manager.values = [
            { id: 'id1', name: 'name1' },
            { id: 'id2', name: 'name2' },
        ];

        expect(manager.values.length).toEqual(2);
        expect(manager.selectedId).toBeNull();
        expect(manager.selectedValue).toBeNull();

        manager.selectedId = 'id1';

        expect(manager.selectedId).toBe('id1');
        expect(manager.selectedValue).toEqual(manager.values[0]);
        expect(manager.selectedIds).toEqual(['id1']);
        expect(manager.selectedValues).toEqual([manager.values[0]]);
        expect(manager.hasSelectedItem).toBeTrue();

        manager.selectedId = null;

        expect(manager.selectedId).toBeNull();
        expect(manager.selectedValue).toBeNull();
        expect(manager.hasSelectedItem).toBeFalse();

        expect(() => {
            manager.selectedId = 'id3';
        }).toThrow(new Error('Some elements are not in the select list: id3'));

        manager.selectedIds = ['id2'];

        expect(manager.selectedId).toBe('id2');
        expect(manager.selectedValue).toEqual(manager.values[1]);
        expect(manager.selectedIds).toEqual(['id2']);
        expect(manager.selectedValues).toEqual([manager.values[1]]);
        expect(manager.hasSelectedItem).toBeTrue();

        expect(() => {
            manager.selectedIds = ['id1', 'id2'];
        }).toThrow(new Error('Cannot set multiple selected ids in a non multiple select'));

        expect(manager.findValue('id1')).toEqual(manager.values[0]);
        expect(manager.findValue('id2')).toEqual(manager.values[1]);

        manager.clearValues();

        expect(manager.values).toEqual([]);
        expect(manager.selectedId).toBeNull();
        expect(manager.selectedValue).toBeNull();

        manager.values = [
            { id: 'id1', name: 'name1' },
            { id: 'id2', name: 'name2' },
        ];

        manager.values = [];
        expect(manager.values).toEqual([]);
        expect(manager.selectedId).toBeNull();
        expect(manager.selectedValue).toBeNull();
    });

    it('should work with multiple = true', () => {
        const manager = new SelectManager(true);

        expect(manager.values).toEqual([]);
        expect(manager.selectedIds).toEqual([]);
        expect(manager.selectedValues).toEqual([]);

        manager.values = [
            { id: 'id1', name: 'name1' },
            { id: 'id2', name: 'name2' },
        ];

        expect(manager.values.length).toEqual(2);
        expect(manager.selectedIds).toEqual([]);
        expect(manager.selectedValues).toEqual([]);

        manager.selectedIds = ['id1'];

        expect(manager.selectedIds).toEqual(['id1']);
        expect(manager.selectedValues).toEqual([manager.values[0]]);
        expect(manager.hasSelectedItem).toBeTrue();

        manager.selectedIds = [];

        expect(manager.selectedIds).toEqual([]);
        expect(manager.selectedValues).toEqual([]);
        expect(manager.hasSelectedItem).toBeFalse();

        expect(() => {
            manager.selectedId = 'id3';
        }).toThrow(new Error('Cannot set selectedId with a multiple select'));

        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            manager.selectedId;
        }).toThrow(new Error('Cannot get selectedId with a multiple select'));

        manager.selectedIds = ['id1', 'id2'];

        expect(manager.selectedIds).toEqual(['id1', 'id2']);
        expect(manager.selectedValues).toEqual(manager.values);
        expect(manager.hasSelectedItem).toBeTrue();

        expect(() => {
            manager.selectedIds = ['id1', 'id3'];
        }).toThrow(new Error('Some elements are not in the select list: id3'));

        expect(manager.findValue('id1')).toEqual(manager.values[0]);
        expect(manager.findValue('id2')).toEqual(manager.values[1]);

        manager.clearValues();

        expect(manager.values).toEqual([]);
        expect(manager.selectedIds).toEqual([]);
        expect(manager.selectedValues).toEqual([]);

        manager.values = [
            { id: 'id1', name: 'name1' },
            { id: 'id2', name: 'name2' },
        ];

        manager.values = [];
        expect(manager.values).toEqual([]);
        expect(manager.selectedIds).toEqual([]);
        expect(manager.selectedValues).toEqual([]);
    });
});
