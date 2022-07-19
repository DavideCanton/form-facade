const has = Object.hasOwnProperty;

export function forEachObject<T extends object>(object: T, callback: <K extends keyof T & string>(v: T[K], k: K, obj: T) => void)
{
    for (let k in object)
        if (typeof k === 'string' && has.call(object, k))
            callback(object[k], k, object);
}

export function mapToObject<T extends string, V>(array: T[], callback: (t: T) => V): Record<T, V>
{
    return array.reduce(
        (acc, v) =>
        {
            const value = callback(v);
            return { ...acc, [v]: value };
        },
        {} as Record<T, V>
    );
}

export function mapValues<T extends object, V>(obj: T, mapper: <K extends keyof T>(v: T[K], k: K) => V): Record<keyof T & string, V>
{
    return mapToObject<keyof T & string, V>(
        Object.keys(obj) as (keyof T & string)[],
        k => mapper(obj[k], k)
    );
}