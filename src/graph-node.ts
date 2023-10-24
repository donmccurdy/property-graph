/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import {
	LegacyRefListKeys,
	LegacyRefMapKeys,
	LiteralKeys,
	Nullable,
	RefKeys,
	RefListKeys,
	RefMapKeys,
	RefSetKeys,
} from './constants.js';
import { BaseEvent, EventDispatcher, GraphNodeEvent } from './event-dispatcher.js';
import { Graph } from './graph.js';
import { GraphEdge } from './graph-edge.js';
import { Ref, RefList, RefMap, RefSet } from './refs.js';
import { isPlainObject } from './utils.js';

// References:
// - https://stackoverflow.com/a/70163679/1314762
// - https://stackoverflow.com/a/70201805/1314762

type GraphNodeAttributesInternal<Parent extends GraphNode, Attributes extends {}> = {
	[Key in keyof Attributes]: Attributes[Key] extends GraphNode
		? GraphEdge<Parent, Attributes[Key]>
		: Attributes[Key] extends GraphNode[]
		? GraphEdge<Parent, Attributes[Key][number]>[]
		: Attributes[Key] extends { [key: string]: GraphNode }
		? Record<string, GraphEdge<Parent, Attributes[Key][string]>>
		: Attributes[Key];
};

export const $attributes = Symbol('attributes');
export const $immutableKeys = Symbol('immutableKeys');

/**
 * Represents a node in a {@link Graph}.
 */
export abstract class GraphNode<Attributes extends {} = {}> extends EventDispatcher<GraphNodeEvent> {
	private _disposed = false;

	/**
	 * Internal graph used to search and maintain references.
	 * @hidden
	 */
	protected readonly graph: Graph<GraphNode>;

	/**
	 * Attributes (literal values and GraphNode references) associated with this instance. For each
	 * GraphNode reference, the attributes stores a {@link GraphEdge}. List and Map references are
	 * stored as arrays and dictionaries of edges.
	 * @internal
	 */
	protected readonly [$attributes]: GraphNodeAttributesInternal<this, Attributes>;

	/**
	 * Attributes included with `getDefaultAttributes` are considered immutable, and cannot be
	 * modifed by `.setRef()`, `.copy()`, or other GraphNode methods. Both the edges and the
	 * properties will be disposed with the parent GraphNode.
	 *
	 * Currently, only single-edge references (getRef/setRef) are supported as immutables.
	 *
	 * @internal
	 */
	protected readonly [$immutableKeys]: Set<string>;

	constructor(graph: Graph<GraphNode>) {
		super();
		this.graph = graph;
		this[$immutableKeys] = new Set();
		this[$attributes] = this._createAttributes();
	}

	/**
	 * Returns default attributes for the graph node. Subclasses having any attributes (either
	 * literal values or references to other graph nodes) must override this method. Literal
	 * attributes should be given their default values, if any. References should generally be
	 * initialized as empty (Ref → null, RefList → [], RefMap → {}) and then modified by setters.
	 *
	 * Any single-edge references (setRef) returned by this method will be considered immutable,
	 * to be owned by and disposed with the parent node. Multi-edge references (addRef, removeRef,
	 * setRefMap) cannot be returned as default attributes.
	 */
	protected getDefaults(): Nullable<Attributes> {
		return {} as Nullable<Attributes>;
	}

	/**
	 * Constructs and returns an object used to store a graph nodes attributes. Compared to the
	 * default Attributes interface, this has two distinctions:
	 *
	 * 1. Slots for GraphNode<T> objects are replaced with slots for GraphEdge<this, GraphNode<T>>
	 * 2. GraphNode<T> objects provided as defaults are considered immutable
	 *
	 * @internal
	 */
	private _createAttributes(): GraphNodeAttributesInternal<this, Attributes> {
		const defaultAttributes = this.getDefaults();
		const attributes = {} as GraphNodeAttributesInternal<this, Attributes>;
		for (const key in defaultAttributes) {
			const value = defaultAttributes[key] as any;
			// TODO(api): If implementation exposes Ref<Property> then
			// presumably it must also pass one here?
			if (value instanceof GraphNode) {
				const ref = this.graph.createEdge(key, this, value);
				ref.addEventListener('dispose', () => value.dispose());
				this[$immutableKeys].add(key);
				attributes[key] = ref as any;
			} else {
				attributes[key] = value as any;
			}
		}
		return attributes;
	}

	/** @internal Returns true if two nodes are on the same {@link Graph}. */
	public isOnGraph(other: GraphNode): boolean {
		return this.graph === other.graph;
	}

	/** Returns true if the node has been permanently removed from the graph. */
	public isDisposed(): boolean {
		return this._disposed;
	}

	/**
	 * Removes both inbound references to and outbound references from this object. At the end
	 * of the process the object holds no references, and nothing holds references to it. A
	 * disposed object is not reusable.
	 */
	public dispose(): void {
		if (this._disposed) return;
		this.graph.listChildEdges(this).forEach((edge) => edge.dispose());
		this.graph.disconnectParents(this);
		this._disposed = true;
		this.dispatchEvent({ type: 'dispose' });
	}

	/**
	 * Removes all inbound references to this object. At the end of the process the object is
	 * considered 'detached': it may hold references to child resources, but nothing holds
	 * references to it. A detached object may be re-attached.
	 */
	public detach(): this {
		this.graph.disconnectParents(this);
		return this;
	}

	/**
	 * Transfers this object's references from the old node to the new one. The old node is fully
	 * detached from this parent at the end of the process.
	 *
	 * @hidden
	 */
	public swap(prevValue: GraphNode, nextValue: GraphNode): this {
		for (const attribute in this[$attributes]) {
			const value = this[$attributes][attribute] as Ref | Ref[] | RefMap;
			if (value instanceof Ref) {
				const ref = value as Ref;
				if (ref.getChild() === prevValue) {
					this.setRef(attribute as any, nextValue, ref.getAttributes());
				}
			} else if (value instanceof RefList) {
				for (const ref of value.listRefsByChild(prevValue)) {
					const refAttributes = ref.getAttributes();
					this.removeRef(attribute as any, prevValue as any);
					this.addRef(attribute as any, nextValue as any, refAttributes);
				}
			} else if (value instanceof RefSet) {
				const ref = value.getRefByChild(prevValue);
				if (ref) {
					const refAttributes = ref.getAttributes();
					this.removeRef(attribute as any, prevValue as any);
					this.addRef(attribute as any, nextValue as any, refAttributes);
				}
			} else if (value instanceof RefMap) {
				for (const key of value.keys()) {
					const ref = value.get(key)!;
					if (ref.getChild() === prevValue) {
						this.setRefMap(attribute as any, key, nextValue, ref.getAttributes());
					}
				}
			}
		}
		return this;
	}

	/**********************************************************************************************
	 * Literal attributes.
	 */

	/** @hidden */
	protected get<K extends LiteralKeys<Attributes>>(attribute: K): Attributes[K] {
		return this[$attributes][attribute] as Attributes[K];
	}

	/** @hidden */
	protected set<K extends LiteralKeys<Attributes>>(attribute: K, value: Attributes[K]): this {
		(this[$attributes][attribute] as Attributes[K]) = value;
		return this.dispatchEvent({ type: 'change', attribute });
	}

	/**********************************************************************************************
	 * Ref: 1:1 graph node references.
	 */

	/** @hidden */
	protected getRef<K extends RefKeys<Attributes>>(attribute: K): (GraphNode & Attributes[K]) | null {
		const ref = this[$attributes][attribute] as Ref;
		return ref ? (ref.getChild() as GraphNode & Attributes[K]) : null;
	}

	/** @hidden */
	protected setRef<K extends RefKeys<Attributes>>(
		attribute: K,
		value: (GraphNode & Attributes[K]) | null,
		attributes?: Record<string, unknown>,
	): this {
		if (this[$immutableKeys].has(attribute as string)) {
			throw new Error(`Cannot overwrite immutable attribute, "${attribute as string}".`);
		}

		const prevRef = this[$attributes][attribute] as Ref;
		if (prevRef) prevRef.dispose(); // TODO(cleanup): Possible duplicate event.

		if (!value) return this;

		const ref = this.graph.createEdge(attribute as string, this, value, attributes);
		ref.addEventListener('dispose', () => {
			delete this[$attributes][attribute];
			this.dispatchEvent({ type: 'change', attribute });
		});
		(this[$attributes][attribute] as Ref) = ref;

		return this.dispatchEvent({ type: 'change', attribute });
	}

	/**********************************************************************************************
	 * RefList: 1:many graph node references.
	 */

	/** @hidden */
	protected listRefs<
		K extends RefListKeys<Attributes> | RefSetKeys<Attributes> | LegacyRefListKeys<Attributes>,
		T extends GraphNode,
	>(attribute: K): Attributes[K] extends RefList<T> | RefSet<T> | T[] ? T[] : never {
		const refs = this.assertRefList(attribute);
		return refs.values().map((ref) => ref.getChild()) as Attributes[K] extends RefList<T> | RefSet<T> | T[]
			? T[]
			: never;
	}

	/** @hidden */
	protected addRef<
		K extends RefListKeys<Attributes> | RefSetKeys<Attributes> | LegacyRefListKeys<Attributes>,
		T extends GraphNode,
	>(
		attribute: K,
		value: Attributes[K] extends RefList<T> | RefSet<T> | LegacyRefListKeys<Attributes> ? T : never,
		attributes?: Record<string, unknown>,
	): this {
		const ref = this.graph.createEdge(attribute as string, this, value, attributes);

		const refs = this.assertRefList(attribute);
		refs.add(ref);

		ref.addEventListener('dispose', () => {
			refs.remove(ref);
			this.dispatchEvent({ type: 'change', attribute });
		});

		return this.dispatchEvent({ type: 'change', attribute });
	}

	/** @hidden */
	protected removeRef<
		K extends RefListKeys<Attributes> | RefSetKeys<Attributes> | LegacyRefListKeys<Attributes>,
		T extends GraphNode,
	>(
		attribute: K,
		value: Attributes[K] extends RefList<T> | RefSet<T> | LegacyRefListKeys<Attributes> ? T : never,
	): this {
		const refs = this.assertRefList(attribute);

		if (refs instanceof RefList) {
			for (const ref of refs.removeChild(value)) {
				ref.dispose();
			}
		} else {
			const ref = refs.removeChild(value);
			if (ref) ref.dispose();
		}

		return this;
	}

	/** @hidden */
	private assertRefList<K extends RefListKeys<Attributes> | RefSetKeys<Attributes> | LegacyRefListKeys<Attributes>>(
		attribute: K,
	): RefList | RefSet {
		const list = this[$attributes][attribute];

		if (list instanceof RefList || list instanceof RefSet) {
			return list;
		} else if (Array.isArray(list)) {
			const refs = new RefList(list as Ref[]);
			return ((this[$attributes][attribute] as RefList) = refs);
		}

		throw new Error(`Unexpected value for "${attribute as string}"`);
	}

	/**********************************************************************************************
	 * RefMap: Named 1:many (map) graph node references.
	 */

	/** @hidden */
	protected listRefMapKeys<K extends RefMapKeys<Attributes> | LegacyRefMapKeys<Attributes>>(attribute: K): string[] {
		return this.assertRefMap(attribute).keys();
	}

	// TODO(types): Check.
	/** @hidden */
	protected listRefMapValues<K extends RefMapKeys<Attributes> | LegacyRefMapKeys<Attributes>>(
		attribute: K,
	): GraphNode[] & Attributes[K][keyof Attributes[K]][] {
		return this.assertRefMap(attribute)
			.values()
			.map((ref: any) => ref.getChild());
	}

	// TODO(types): Check.
	/** @hidden */
	protected getRefMap<
		K extends RefMapKeys<Attributes> | LegacyRefMapKeys<Attributes>,
		SK extends keyof Attributes[K],
	>(attribute: K, key: SK): (GraphNode & Attributes[K][SK]) | null {
		const refMap = this.assertRefMap(attribute);
		const ref = refMap.get(key as string);
		return ref ? (ref.getChild() as GraphNode & Attributes[K][SK]) : null;
	}

	// TODO(types): Check.
	/** @hidden */
	protected setRefMap<K extends RefMapKeys<Attributes>, SK extends keyof Attributes[K]>(
		attribute: K,
		key: SK,
		value: (GraphNode & Attributes[K][SK]) | null,
		metadata?: Record<string, unknown>,
	): this {
		const refMap = this.assertRefMap(attribute);

		const prevRef = refMap.get(key as string);
		if (prevRef) prevRef.dispose(); // TODO(cleanup): Possible duplicate event.

		if (!value) return this;

		metadata = Object.assign(metadata || {}, { key: key });
		const ref = this.graph.createEdge(attribute as string, this, value, { ...metadata, key });
		ref.addEventListener('dispose', () => {
			refMap.delete(key as string);
			this.dispatchEvent({ type: 'change', attribute, key });
		});
		refMap.set(key as string, ref);

		return this.dispatchEvent({ type: 'change', attribute, key });
	}

	/** @hidden */
	private assertRefMap<K extends RefMapKeys<Attributes> | LegacyRefMapKeys<Attributes>>(attribute: K): RefMap {
		const map = this[$attributes][attribute];

		if (map instanceof RefMap) {
			return map as RefMap;
		} else if (isPlainObject(map)) {
			const refMap = new RefMap(map as any);
			return ((this[$attributes][attribute] as RefMap) = refMap);
		}

		throw new Error(`Unexpected value for "${attribute as string}"`);
	}

	/**********************************************************************************************
	 * Events.
	 */

	/**
	 * Dispatches an event on the GraphNode, and on the associated
	 * Graph. Event types on the graph are prefixed, `"node:[type]"`.
	 */
	dispatchEvent(event: BaseEvent): this {
		super.dispatchEvent({ ...event, target: this });
		this.graph.dispatchEvent({ ...event, target: this, type: `node:${event.type}` });
		return this;
	}
}
