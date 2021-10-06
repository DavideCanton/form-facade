export type PropsOfType<T, TP> = {
  [K in keyof T]: T[K] extends TP ? K : never
}[keyof T];

export type PropsNotOfType<T, TP> = Exclude<keyof T, PropsOfType<T, TP>>;

export type ElementOf<T> = T extends (infer TE)[] ? TE : never;
