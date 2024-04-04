import { GraphEdge } from './graph-edge.js';
import { GraphNode } from './graph-node.js';

export type Ref<T extends GraphNode = GraphNode> = GraphEdge<GraphNode, T>;

/**
 * An ordered collection of {@link Ref Refs}, allowing duplicates. Removing
 * a Ref is an O(n) operation — use {@link RefSet} for faster removal, if
 * duplicates are not required.
 */
export class RefList<T extends GraphNode = GraphNode> {
	list: Ref<T>[] = [];
	constructor(refs?: Ref<T>[]) {
		if (refs) {
			for (const ref of refs) {
				this.list.push(ref);
			}
		}
	}
	add(ref: Ref<T>): void {
		this.list.push(ref);
	}
	remove(ref: Ref<T>): void {
		const index = this.list.indexOf(ref);
		if (index >= 0) this.list.splice(index, 1);
	}
	removeChild(child: T): Ref<T>[] {
		const refs = [] as Ref<T>[];
		for (const ref of this.list) {
			if (ref.getChild() === child) {
				refs.push(ref);
			}
		}
		for (const ref of refs) {
			this.remove(ref);
		}
		return refs;
	}
	listRefsByChild(child: T): Ref<T>[] {
		const refs = [] as Ref<T>[];
		for (const ref of this.list) {
			if (ref.getChild() === child) {
				refs.push(ref);
			}
		}
		return refs;
	}
	values(): Ref<T>[] {
		return this.list;
	}
}

interface LLItem<T> {
	prev: LLItem<T> | null;
	next: LLItem<T> | null;
	ref: T;
}

/**
 * An ordered collection of {@link Ref Refs}, allowing duplicates,
 * stored as a linked list.
 * @experimental
 */
export class RefLinkedList<T extends GraphNode = GraphNode> {
	private _head: LLItem<Ref<T>> | null = null;
	private _tail: LLItem<Ref<T>> | null = null;
	constructor(refs?: Ref<T>[]) {
		if (refs) {
			for (const ref of refs) {
				this.add(ref);
			}
		}
	}
	add(ref: Ref<T>): void {
		const next = { prev: this._tail, next: null, ref };
		this._head ||= next;
		if (this._tail) {
			this._tail.next = next;
		}
		this._tail = next;
	}
	remove(ref: Ref<T>): void {
		for (let item = this._head; item; item = item.next) {
			if (item.ref === ref) {
				if (item.prev) item.prev.next = item.next;
				if (item.next) item.next.prev = item.prev;
				if (item === this._head) this._head = item.next;
				if (item === this._tail) this._tail = item.prev;
				// TODO(design): Break?
			}
		}
	}
	removeChild(child: T): Ref<T>[] {
		const refs = [] as Ref<T>[];
		for (let item = this._head; item; item = item.next) {
			if (item.ref.getChild() === child) {
				if (item.prev) item.prev.next = item.next;
				if (item.next) item.next.prev = item.prev;
				if (item === this._head) this._head = item.next;
				if (item === this._tail) this._tail = item.prev;
				refs.push(item.ref);
				// TODO(design): Break?
			}
		}
		return refs;
	}
	listRefsByChild(child: T): Ref<T>[] {
		const refs = [] as Ref<T>[];
		for (let item = this._head; item; item = item.next) {
			if (item.ref.getChild() === child) {
				refs.push(item.ref);
				// TODO(design): Allow? getRefByChild?
			}
		}
		return refs;
	}
	values(): Ref<T>[] {
		const refs = [] as Ref<T>[];
		for (let item = this._head; item; item = item.next) {
			refs.push(item.ref);
		}
		return refs;
	}
}

/**
 * An ordered collection of {@link Ref Refs}, without duplicates. Adding or
 * removing a Ref is typically O(1) or O(log(n)), and faster than
 * {@link RefList}. If support for duplicates is required, use {@link RefList}.
 */
export class RefSet<T extends GraphNode = GraphNode> {
	set = new Set<Ref<T>>();
	map = new Map<T, Ref<T>>();
	constructor(refs?: Ref<T>[]) {
		if (refs) {
			for (const ref of refs) {
				this.add(ref);
			}
		}
	}
	add(ref: Ref<T>): void {
		const child = ref.getChild();
		this.removeChild(child);

		this.set.add(ref);
		this.map.set(child, ref);
	}
	remove(ref: Ref<T>): void {
		this.set.delete(ref);
		this.map.delete(ref.getChild());
	}
	removeChild(child: T): Ref<T> | null {
		const ref = this.map.get(child) || null;
		if (ref) this.remove(ref);
		return ref;
	}
	getRefByChild(child: T): Ref<T> | null {
		return this.map.get(child) || null;
	}
	values(): Ref<T>[] {
		return Array.from(this.set);
	}
}

/**
 * Map (or dictionary) from string keys to {@link Ref Refs}.
 */
export class RefMap<T extends GraphNode = GraphNode> {
	map: { [key: string]: Ref<T> } = {};
	constructor(map?: Record<string, Ref<T>>) {
		if (map) {
			Object.assign(this.map, map);
		}
	}
	set(key: string, child: Ref<T>): void {
		this.map[key] = child;
	}
	delete(key: string): void {
		delete this.map[key];
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
