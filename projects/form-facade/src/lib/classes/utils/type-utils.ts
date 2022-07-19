export type PropsOfType<T, TP> = {
    [K in keyof T]: T[K] extends TP ? K : never;
}[keyof T];
