import type { Ref, RefMap } from './constants.js';
import { GraphEdge } from './graph-edge.js';

export function isRef(value: Ref | unknown): boolean {
	return value instanceof GraphEdge;
}

export function isRefList(value: Ref[] | unknown): boolean {
	return Array.isArray(value) && value[0] instanceof GraphEdge;
}

export function isRefMap(value: RefMap | unknown): boolean {
	return !!(value && typeof value === 'object' && Object.values(value)[0] instanceof GraphEdge);
}
