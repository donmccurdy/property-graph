import { GraphEdge } from './graph-edge.js';
import { GraphNode } from './graph-node.js';

export const Ref = GraphEdge;
export type Ref<T extends GraphNode = GraphNode> = GraphEdge<GraphNode, T>;

export class RefList<T extends GraphNode = GraphNode> {
	set = new Set<Ref<T>>();
	add(child: Ref<T>): void {
		this.set.add(child);
	}
	remove(child: Ref<T>): void {
		this.set.delete(child);
	}
	has(child: Ref<T>): boolean {
		return this.set.has(child);
	}
	values(): Ref<T>[] {
		return Array.from(this.set);
	}
}

export class RefMap<T extends GraphNode = GraphNode> {
	map: { [key: string]: Ref<T> } = {};
	add(key: string, child: Ref<T>): void {
		this.map[key] = child;
	}
	remove(key: string): void {
		delete this.map[key];
	}
	has(key: string): boolean {
		return key in this.map;
	}
	get(key: string): Ref<T> | null {
		return this.map[key] || null;
	}
	keys(): string[] {
		return Object.keys(this.map);
	}
	values(): Ref<T>[] {
		return Object.values(this.map);
	}
}

export type UnknownRef = Ref | RefList | RefMap | unknown;
