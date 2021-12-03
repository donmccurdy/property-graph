/** TypeScript utility for nullable types. */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

/** Abstraction representing a typed array class. */
export type TypedArray = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int32Array | Int16Array | Int8Array;
