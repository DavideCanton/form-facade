export function forEachObject<T extends object>(object: T, callback: <K extends keyof T & string>(v: T[K], k: K, obj: T) => void)
{
    const has = Object.hasOwnProperty;
    for(let k in object)
        if(has.call(object, k))
            callback(object[k], k, object);
}
