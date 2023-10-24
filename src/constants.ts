import { GraphNode } from './graph-node.js';
import type { Ref, RefList, RefMap, RefSet } from './refs.js';

/** TypeScript utility for nullable types. */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

/** Abstraction representing a typed array class. */
export type TypedArray = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int32Array | Int16Array | Int8Array;

export type Literal =
	| null
	| boolean
	| number
	| string
	| number[]
	| string[]
	| TypedArray
	| ArrayBuffer
	| Record<string, unknown>;

export type LiteralKeys<T> = { [K in keyof T]-?: T[K] extends Literal ? K : never }[keyof T];

export type RefKeys<T> = { [K in keyof T]-?: T[K] extends Ref ? K : never }[keyof T];
export type RefListKeys<T> = { [K in keyof T]-?: T[K] extends RefList ? K : never }[keyof T];
export type RefSetKeys<T> = { [K in keyof T]-?: T[K] extends RefSet ? K : never }[keyof T];
export type RefMapKeys<T> = { [K in keyof T]-?: T[K] extends RefMap ? K : never }[keyof T];

// TODO(v1): Remove legacy types.
export type LegacyRefListKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode[] ? K : never }[keyof T];
export type LegacyRefMapKeys<T> = { [K in keyof T]-?: T[K] extends { [key: string]: GraphNode } ? K : never }[keyof T];

// TODO(v1): Remove legacy types.
// export type AnyRefOrderedCollectionKeys<T> = RefListKeys<T> | RefSetKeys<T> | LegacyRefListKeys<T>;
// export type AnyRefMapKeys<T> = RefMapKeys<T> | LegacyRefMapKeys<T>;
