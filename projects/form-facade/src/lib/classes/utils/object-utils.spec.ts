import { forEachObject } from './object-utils';

describe('forEachObject', () =>
{
    it('should work with plain object', () =>
    {
        const obj = { n: 1, s: 'str', f: () => { } };

        const res = invokeAndSort(obj);

        expect(res.length).toBe(3);
        expect(res[0]).toEqual(['f', obj.f]);
        expect(res[1]).toEqual(['n', obj.n]);
        expect(res[2]).toEqual(['s', obj.s]);
    });

    it('should work with classes', () =>
    {
        class C
        {
            constructor(
                public n: number,
                public s: string
            ) { }
            m() { }
        }

        class D extends C
        {
            constructor(
                n: number,
                s: string,
                public x: string
            )
            {
                super(n, s);
            }

            ff() { }
        }

        const obj = new D(1, 'a', 'b');

        const res = invokeAndSort(obj);
        expect(res.length).toBe(3);
        expect(res[0]).toEqual(['n', obj.n]);
        expect(res[1]).toEqual(['s', obj.s]);
        expect(res[2]).toEqual(['x', obj.x]);
    });
});


type EntryType<T> = {
    [K in keyof T]: [K, T[K]]
}[keyof T];


function invokeAndSort<T extends object>(obj: T): EntryType<T>[]
{
    const res = [];
    forEachObject(obj, (v, k, o) =>
    {
        res.push([k, v]);
        expect(o).toBe(obj);
    });

    res.sort((e1: [string, any], e2: [string, any]) => e1[0].localeCompare(e2[0]));
    return res;
}
