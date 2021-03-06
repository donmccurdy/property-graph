import type { GraphEdge } from './graph-edge';
import type { GraphNode } from './graph-node';

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
export type RefKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode ? K : never }[keyof T];
export type RefListKeys<T> = { [K in keyof T]-?: T[K] extends GraphNode[] ? K : never }[keyof T];
export type RefMapKeys<T> = { [K in keyof T]-?: T[K] extends { [key: string]: GraphNode } ? K : never }[keyof T];

export type Ref = GraphEdge<GraphNode, GraphNode>;
export type RefMap = { [key: string]: Ref };
export type UnknownRef = Ref | Ref[] | RefMap | unknown;
