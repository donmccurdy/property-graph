import type { GraphNode } from './graph-node.js';
import type { RefList, RefMap, RefSet } from './refs.js';

/** TypeScript utility for nullable types. */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

export type Literal =
	| null
	| boolean
	| number
	| string
	| number[]
	| string[]
	| ArrayBuffer
	| ArrayBufferView
	| Record<string, unknown>;

export type LiteralKeys<T> = { [K in keyof T]-?: T[K] extends Literal ? K : never }[keyof T];

export type RefKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode ? K : never }[keyof T];
export type RefListKeys<T> = { [K in keyof T]-?: T[K] extends RefList ? K : never }[keyof T];
export type RefListValue<List> = List extends RefList<infer V> ? V : never;
export type RefSetKeys<T> = { [K in keyof T]-?: T[K] extends RefSet ? K : never }[keyof T];
export type RefSetValue<Set> = Set extends RefSet<infer V> ? V : never;
export type RefMapKeys<T> = { [K in keyof T]-?: T[K] extends RefMap ? K : never }[keyof T];
export type RefMapValue<Map> = Map extends RefMap<infer V> ? V : never;

export type RefCollectionValue<Collection> = Collection extends RefList<infer T> | RefSet<infer T> | RefMap<infer T>
	? T
	: never;
