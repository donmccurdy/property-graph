require('source-map-support').install();

import test from 'tape';
import { Graph, GraphNode, Link } from '../';

interface ITestNode {
	nodes: TestNode[];
}

/**
 * Simple test implementation of GraphNode.
 */
class TestNode extends GraphNode<ITestNode> {
	propertyType = 'test';
	getDefaults(): ITestNode {
		return { ...super.getDefaults(), nodes: [] };
	}
	addNode(node: TestNode): this {
		return this.addRef('nodes', node);
	}
	removeNode(node: TestNode): this {
		return this.removeRef('nodes', node);
	}
	listNodes(): TestNode[] {
		return this.listRefs('nodes');
	}
}

test('property-graph::exports', (t: test.Test) => {
	t.ok(Graph, 'implement Graph');
	t.ok(GraphNode, 'implement GraphNode');
	t.ok(Link, 'implement Link');
	t.end();
});

test('property-graph::graph | link management', (t) => {
	const graph = new Graph();
	const root = new TestNode(graph);
	const a = new TestNode(graph);
	const b = new TestNode(graph);

	root.addNode(a).addNode(b);
	a.addNode(b);
	t.deepEqual(root.listNodes(), [a, b], 'Added two nodes.');
	t.deepEqual(a.listNodes(), [b], 'Added a child');

	root.removeNode(a);
	t.deepEqual(root.listNodes(), [b], 'Removed a node.');

	b.dispose();
	t.deepEqual(root.listNodes(), [], 'Disposed a node.');

	// Subjective behavior, but might as well unit test it.
	root.addNode(a).addNode(b).addNode(b).addNode(b);
	t.deepEqual(root.listNodes(), [a, b, b, b], 'Added duplicate nodes.');
	root.removeNode(b);
	t.deepEqual(root.listNodes(), [a], 'Removed a duplicate node.');
	root.removeNode(b).removeNode(b).removeNode(b);
	t.deepEqual(root.listNodes(), [a], 'Removed a non-present node repeatedly.');

	// Detach.
	a.detach();
	t.deepEqual(root.listNodes(), [], 'Detached a node.');

	// Dispose.
	root.addNode(a);
	a.dispose();
	t.deepEqual(root.listNodes(), [], 'Disposed a node.');

	root.addNode(b);
	root.dispose();
	t.deepEqual(root.listNodes(), [], 'Disposed the root, confirmed empty.');
	t.equal(root.isDisposed(), true, 'Disposed the root, confirmed disposed.');
	t.end();
});

test('property-graph::graph | prevents cross-graph linking', (t) => {
	const graphA = new Graph();
	const graphB = new Graph();

	const rootA = new TestNode(graphA);
	const rootB = new TestNode(graphB);

	const nodeA = new TestNode(graphA);
	const nodeB = new TestNode(graphB);

	rootA.addNode(nodeA);

	t.throws(() => rootB.addNode(nodeA), 'prevents linking node from another graph, used');
	t.throws(() => rootA.addNode(nodeB), 'prevents linking node from another graph, unused');
	t.end();
});

test('property-graph::graph | list connections', (t) => {
	const graph = new Graph();
	const root = new TestNode(graph);
	const node1 = new TestNode(graph);
	const node2 = new TestNode(graph);

	node1.addNode(node2);
	root.addNode(node1);

	t.equal(graph.listLinks().length, 2, 'listLinks()');
	t.deepEqual(
		graph.listParentLinks(node1).map((link) => link.getParent()),
		[root],
		'listParentLinks(A)'
	);
	t.deepEqual(
		graph.listChildLinks(node1).map((link) => link.getChild()),
		[node2],
		'listChildLinks(A)'
	);
	t.deepEqual(
		graph.listParentLinks(node2).map((link) => link.getParent()),
		[node1],
		'listParentLinks(B)'
	);
	t.deepEqual(
		graph.listChildLinks(node2).map((link) => link.getChild()),
		[],
		'listParentLinks(B)'
	);
	t.end();
});

test('property-graph::graph | dispose events', (t) => {
	const graph = new Graph();
	const node1 = new TestNode(graph);
	const node2 = new TestNode(graph);

	const disposed = [] as unknown[];

	graph.on('dispose', (target: unknown) => disposed.push(target));

	t.deepEqual(disposed, [], 'disposed: 0');
	t.notOk(node1.isDisposed(), 'node1 active');
	t.notOk(node2.isDisposed(), 'node2 active');

	node2.dispose();
	t.deepEqual(disposed, [node2], 'disposed: 1');

	node1.dispose();
	t.deepEqual(disposed, [node2, node1], 'disposed: 2');
	t.ok(node1.isDisposed(), 'node1 disposed');
	t.ok(node2.isDisposed(), 'node2 disposed');
	t.end();
});

test('property-graph::graph-node | swap', (t) => {
	const graph = new Graph();
	const root = new TestNode(graph);
	const a = new TestNode(graph);
	const b = new TestNode(graph);

	root.addNode(a);
	t.deepEquals(root.listNodes(), [a], 'adds A');
	t.deepEqual(graph.listChildren(root), [a], 'consistent graph state, parentRefs');
	t.deepEqual(graph.listParents(a), [root], 'consistent graph state, childRefs (1/2)');
	t.deepEqual(graph.listParents(b), [], 'consistent graph state, childRefs (2/2)');

	root.swap(a, b);
	t.deepEquals(root.listNodes(), [b], 'swaps A -> B');
	t.deepEqual(graph.listChildren(root), [b], 'consistent graph state, parentRefs');
	t.deepEqual(graph.listParents(a), [], 'consistent graph state, childRefs (1/2)');
	t.deepEqual(graph.listParents(b), [root], 'consistent graph state, childRefs (2/2)');
	t.end();
});
