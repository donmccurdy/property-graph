import { GraphNode } from './graph-node';

/**
 * Represents a connection between two {@link GraphNode} resources in a {@link Graph}.
 *
 * The left node is considered the owner, and the right node the resource. The
 * owner is responsible for being able find and remove a reference to a resource, given
 * that link. The resource does not hold a reference to the link or to the owner,
 * although that reverse lookup can be done on the graph.
 *
 * // TODO(cleanup): Support some kind of type safety for link attributes.
 *
 * @category Graph
 */
export class Link<Parent extends GraphNode, Child extends GraphNode> {
	private _disposed = false;
	private readonly _listeners: (() => void)[] = [];

	constructor(
		private readonly _name: string,
		private readonly _parent: Parent,
		private _child: Child,
		private _attributes: Record<string, unknown> = {}
	) {
		if (!_parent.canLink(_child)) {
			throw new Error('Cannot link disconnected graphs.');
		}
	}

	/** Name. */
	getName(): string {
		return this._name;
	}

	/** Owner node. */
	getParent(): Parent {
		return this._parent;
	}

	/** Resource node. */
	getChild(): Child {
		return this._child;
	}

	/**
	 * Sets the child node.
	 *
	 * @internal Only {@link Graph} implementations may safely call this method directly. Use
	 * 	{@link Property.swap} or {@link Graph.swapChild} instead.
	 */
	setChild(child: Child): this {
		this._child = child;
		return this;
	}

	/** Attributes of the graph node relationship. */
	getAttributes(): Record<string, unknown> {
		return this._attributes;
	}

	/** Destroys a (currently intact) link, updating both the graph and the owner. */
	dispose(): void {
		if (this._disposed) return;
		this._disposed = true;
		this._listeners.forEach((fn) => fn());
		this._listeners.length = 0;
	}

	/** Registers a listener to be invoked if this link is destroyed. */
	onDispose(fn: () => void): this {
		this._listeners.push(fn);
		return this;
	}

	/** Whether this link has been destroyed. */
	isDisposed(): boolean {
		return this._disposed;
	}
}
