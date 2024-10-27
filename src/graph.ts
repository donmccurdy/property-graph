import { EventDispatcher, GraphEdgeEvent, GraphEvent, GraphNodeEvent } from './event-dispatcher.js';
import { GraphEdge } from './graph-edge.js';
import { GraphNode } from './graph-node.js';

/**
 * A graph manages a network of {@link GraphNode} nodes, connected
 * by {@link @Link} edges.
 */
export class Graph<T extends GraphNode> extends EventDispatcher<GraphEvent | GraphNodeEvent | GraphEdgeEvent> {
	private _emptySet: Set<GraphEdge<T, T>> = new Set();

	private _edges: Set<GraphEdge<T, T>> = new Set();
	private _parentEdges: Map<T, Set<GraphEdge<T, T>>> = new Map();
	private _childEdges: Map<T, Set<GraphEdge<T, T>>> = new Map();

	/** Returns a list of all parent->child edges on this graph. */
	public listEdges(): GraphEdge<T, T>[] {
		return Array.from(this._edges);
	}

	/** Returns a list of all edges on the graph having the given node as their child. */
	public listParentEdges(node: T): GraphEdge<T, T>[] {
		return Array.from(this._childEdges.get(node) || this._emptySet);
	}

	/** Returns a list of parent nodes for the given child node. */
	public listParents(node: T): T[] {
		const parentSet = new Set<T>();
		for (const edge of this.listParentEdges(node)) {
			parentSet.add(edge.getParent());
		}
		return Array.from(parentSet);
	}

	/** Returns a list of all edges on the graph having the given node as their parent. */
	public listChildEdges(node: T): GraphEdge<T, T>[] {
		return Array.from(this._parentEdges.get(node) || this._emptySet);
	}

	/** Returns a list of child nodes for the given parent node. */
	public listChildren(node: T): T[] {
		const childSet = new Set<T>();
		for (const edge of this.listChildEdges(node)) {
			childSet.add(edge.getChild());
		}
		return Array.from(childSet);
	}

	public disconnectParents(node: T, filter?: (n: T) => boolean): this {
		for (const edge of this.listParentEdges(node)) {
			if (!filter || filter(edge.getParent())) {
				edge.dispose();
			}
		}
		return this;
	}

	/**********************************************************************************************
	 * Internal.
	 */

	/**
	 * Creates a {@link GraphEdge} connecting two {@link GraphNode} instances. Edge is returned
	 * for the caller to store.
	 * @param a Owner
	 * @param b Resource
	 * @hidden
	 * @internal
	 */
	public _createEdge<A extends T, B extends T>(
		name: string,
		a: A,
		b: B,
		attributes?: Record<string, unknown>,
	): GraphEdge<A, B> {
		const edge = new GraphEdge(name, a, b, attributes);
		this._edges.add(edge);

		const parent = edge.getParent();
		if (!this._parentEdges.has(parent)) this._parentEdges.set(parent, new Set());
		this._parentEdges.get(parent)!.add(edge);

		const child = edge.getChild();
		if (!this._childEdges.has(child)) this._childEdges.set(child, new Set());
		this._childEdges.get(child)!.add(edge);

		return edge;
	}

	/**
	 * Detaches a {@link GraphEdge} from the {@link Graph}. Before calling this
	 * method, ensure that the GraphEdge has first been detached from any
	 * associated {@link GraphNode} attributes.
	 * @hidden
	 * @internal
	 */
	public _destroyEdge(edge: GraphEdge<T, T>): this {
		this._edges.delete(edge);
		this._parentEdges.get(edge.getParent())!.delete(edge);
		this._childEdges.get(edge.getChild())!.delete(edge);
		return this;
	}
}
