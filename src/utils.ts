import { Link } from './graph-link';
import type { GraphNode } from './graph-node';

export type Ref = Link<GraphNode, GraphNode>;
export type RefMap = { [key: string]: Ref };
export type UnknownRef = Ref | Ref[] | RefMap | unknown;

export function isRef(value: Ref | unknown): boolean {
	return value instanceof Link;
}

export function isRefList(value: Ref[] | unknown): boolean {
	return Array.isArray(value) && value[0] instanceof Link;
}

export function isRefMap(value: RefMap | unknown): boolean {
	return !!(value && typeof value === 'object' && Object.values(value)[0] instanceof Link);
}
