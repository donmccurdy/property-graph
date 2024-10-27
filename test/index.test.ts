import test from 'ava';
import { Graph, GraphNode, GraphEdge, RefSet, RefList, RefMap, Nullable } from 'property-graph';

interface IPerson {
	name: string;
	age: number;
	partner: Person;
	friends: RefSet<Person>;
	recentCalls: RefList<Person>;
	relatives: RefMap<Person>;
}

/** Simple test implementation of GraphNode. */
class Person extends GraphNode<IPerson> {
	propertyType = 'person';
	getDefaults(): Nullable<IPerson> {
		return {
			...super.getDefaults(),
			name: '',
			age: 0,
			partner: null,
			friends: new RefSet(),
			recentCalls: new RefList(),
			relatives: new RefMap(),
		};
	}
	getName(): string {
		return this.get('name');
	}
	setName(name: string) {
		return this.set('name', name);
	}
	getPartner(): Person | null {
		return this.getRef('partner');
	}
	setPartner(person: Person | null): this {
		return this.setRef('partner', person);
	}
	addFriend(person: Person) {
		return this.addRef('friends', person);
	}
	addFriendWithLabel(person: Person, label: string) {
		return this.addRef('friends', person, { label });
	}
	removeFriend(person: Person) {
		return this.removeRef('friends', person);
	}
	listFriends(): Person[] {
		return this.listRefs('friends');
	}
	addRecentCall(person: Person) {
		return this.addRef('recentCalls', person);
	}
	removeRecentCall(person: Person) {
		return this.removeRef('recentCalls', person);
	}
	listRecentCalls() {
		return this.listRefs('recentCalls');
	}
	listRelatives() {
		return this.listRefMapValues('relatives');
	}
	setRelative(relation: string, person: Person) {
		return this.setRefMap('relatives', relation, person);
	}
}

test('property-graph::exports', (t) => {
	t.truthy(Graph, 'implement Graph');
	t.truthy(GraphNode, 'implement GraphNode');
	t.truthy(GraphEdge, 'implement GraphEdge');
	t.truthy(RefList, 'implement RefList');
	t.truthy(RefSet, 'implement RefSet');
	t.truthy(RefMap, 'implement RefMap');
});

test('property-graph::graph | edge management', (t) => {
	const graph = new Graph();
	const root = new Person(graph).setName('Root');
	const a = new Person(graph).setName('A');
	const b = new Person(graph).setName('B');

	root.addFriend(a).addFriend(b);
	a.addFriend(b);
	t.deepEqual(root.listFriends(), [a, b], 'Added two nodes.');
	t.deepEqual(a.listFriends(), [b], 'Added a child');

	root.removeFriend(a);
	t.deepEqual(root.listFriends(), [b], 'Removed a node.');

	b.dispose();
	t.deepEqual(root.listFriends(), [], 'Disposed a node.');

	// No duplicates!
	root.addFriend(a).addFriend(b).addFriend(b).addFriend(b);
	t.deepEqual(root.listFriends(), [a, b], 'Added duplicate nodes.');
	root.removeFriend(b);
	t.deepEqual(root.listFriends(), [a], 'Removed a duplicate node.');
	root.removeFriend(b).removeFriend(b).removeFriend(b);
	t.deepEqual(root.listFriends(), [a], 'Removed a non-present node repeatedly.');

	// Duplicates allowed.
	root.addRecentCall(a).addRecentCall(b).addRecentCall(b).addRecentCall(b);
	t.deepEqual(root.listRecentCalls(), [a, b, b, b], 'Added duplicate nodes.');
	root.removeRecentCall(b);
	t.deepEqual(root.listRecentCalls(), [a], 'Removed a duplicate node.');
	root.removeRecentCall(b).removeRecentCall(b).removeRecentCall(b);
	t.deepEqual(root.listRecentCalls(), [a], 'Removed a non-present node repeatedly.');

	root.setRelative('child', a).setRelative('nephew', b);
	a.setRelative('parent', root).setRelative('cousin', b);
	b.setRelative('parent', root).setRelative('cousin', a);
	t.deepEqual(root.listRelatives(), [a, b], 'root.listRelatives()');
	t.deepEqual(a.listRelatives(), [root, b], 'a.listRelatives()');
	t.deepEqual(b.listRelatives(), [root, a], 'b.listRelatives()');

	// Detach.
	a.detach();
	t.deepEqual(root.listFriends(), [], 'Detached friends.');
	t.deepEqual(root.listRecentCalls(), [], 'Detached recent calls.');
	t.deepEqual(root.listRelatives(), [b], 'Detached relatives.');

	// Dispose.
	root.addFriend(a);
	a.dispose();
	t.deepEqual(root.listFriends(), [], 'Disposed a node.');

	root.addFriend(b);
	root.dispose();
	t.deepEqual(root.listFriends(), [], 'Disposed the root, confirmed empty.');
	t.true(root.isDisposed(), 'Disposed the root, confirmed disposed.');
});

test('property-graph::graph | prevents cross-graph edges', (t) => {
	const graphA = new Graph();
	const graphB = new Graph();

	const rootA = new Person(graphA);
	const rootB = new Person(graphB);

	const nodeA = new Person(graphA);
	const nodeB = new Person(graphB);

	rootA.addFriend(nodeA);

	t.throws(() => rootB.addFriend(nodeA), undefined, 'prevents connecting node from another graph, used');
	t.throws(() => rootA.addFriend(nodeB), undefined, 'prevents connecting node from another graph, unused');
});

test('property-graph::graph | list connections', (t) => {
	const graph = new Graph();
	const root = new Person(graph);
	const node1 = new Person(graph);
	const node2 = new Person(graph);

	node1.addFriend(node2);
	root.addFriend(node1);

	t.is(graph.listEdges().length, 2, 'listEdges()');
	t.deepEqual(
		graph.listParentEdges(node1).map((edge) => edge.getParent()),
		[root],
		'listParentEdges(A)',
	);
	t.deepEqual(
		graph.listChildEdges(node1).map((edge) => edge.getChild()),
		[node2],
		'listChildEdges(A)',
	);
	t.deepEqual(
		graph.listParentEdges(node2).map((edge) => edge.getParent()),
		[node1],
		'listParentEdges(B)',
	);
	t.deepEqual(
		graph.listChildEdges(node2).map((edge) => edge.getChild()),
		[],
		'listParentEdges(B)',
	);
});

test('property-graph::graph | dispose events', (t) => {
	const graph = new Graph();
	const node1 = new Person(graph);
	const node2 = new Person(graph);

	const disposed = [] as unknown[];

	graph.addEventListener('node:dispose', ({ target }) => disposed.push(target));

	t.deepEqual(disposed, [], 'disposed: 0');
	t.false(node1.isDisposed(), 'node1 active');
	t.false(node2.isDisposed(), 'node2 active');

	node2.dispose();
	t.deepEqual(disposed, [node2], 'disposed: 1');

	node1.dispose();
	t.deepEqual(disposed, [node2, node1], 'disposed: 2');
	t.true(node1.isDisposed(), 'node1 disposed');
	t.true(node2.isDisposed(), 'node2 disposed');
});

test('property-graph::graph-node | swap', (t) => {
	const graph = new Graph();
	const root = new Person(graph);
	const a = new Person(graph);
	const b = new Person(graph);

	root.addFriend(a);
	t.deepEqual(root.listFriends(), [a], 'adds A');
	t.deepEqual(graph.listChildren(root), [a], 'consistent graph state, parentRefs');
	t.deepEqual(graph.listParents(a), [root], 'consistent graph state, childRefs (1/2)');
	t.deepEqual(graph.listParents(b), [], 'consistent graph state, childRefs (2/2)');

	root.swap(a, b);
	t.deepEqual(root.listFriends(), [b], 'swaps A -> B');
	t.deepEqual(graph.listChildren(root), [b], 'consistent graph state, parentRefs');
	t.deepEqual(graph.listParents(a), [], 'consistent graph state, childRefs (1/2)');
	t.deepEqual(graph.listParents(b), [root], 'consistent graph state, childRefs (2/2)');

	const listLabels = (edges: GraphEdge<GraphNode, GraphNode>[]) => edges.map((edge) => edge.getAttributes());

	root.removeFriend(b);
	root.addFriendWithLabel(a, 'custom-label');
	t.deepEqual(listLabels(graph.listParentEdges(a)), [{ label: 'custom-label' }], 'initial attributes');
	root.swap(a, b);
	t.deepEqual(listLabels(graph.listParentEdges(a)), [], 'removed old edge');
	t.deepEqual(listLabels(graph.listParentEdges(b)), [{ label: 'custom-label' }], 'persist attributes');
});

test('property-graph::graph | listParents', (t) => {
	const graph = new Graph();
	const root = new Person(graph).setName('root');
	const a = new Person(graph).setName('a');
	const b = new Person(graph).setName('b');
	const c = new Person(graph).setName('c');

	root.addFriend(a);
	root.addFriend(b);
	root.addFriend(c);

	a.addFriend(b);
	b.addFriend(c);

	a.addRecentCall(b);

	t.deepEqual(
		graph.listParents(root).map((n) => (n as Person).getName()),
		[],
	);
	t.deepEqual(
		graph.listParents(a).map((n) => (n as Person).getName()),
		['root'],
	);
	t.deepEqual(
		graph.listParents(b).map((n) => (n as Person).getName()),
		['root', 'a'],
	);
	t.deepEqual(
		graph.listParents(c).map((n) => (n as Person).getName()),
		['root', 'b'],
	);
});

test('property-graph::graph | listChildren', (t) => {
	const graph = new Graph();
	const root = new Person(graph).setName('root');
	const a = new Person(graph).setName('a');
	const b = new Person(graph).setName('b');
	const c = new Person(graph).setName('c');

	root.addFriend(a);
	root.addFriend(b);
	root.addFriend(c);

	a.addFriend(b);
	b.addFriend(c);

	a.addRecentCall(b);

	t.deepEqual(
		graph.listChildren(root).map((n) => (n as Person).getName()),
		['a', 'b', 'c'],
	);
	t.deepEqual(
		graph.listChildren(a).map((n) => (n as Person).getName()),
		['b'],
	);
	t.deepEqual(
		graph.listChildren(b).map((n) => (n as Person).getName()),
		['c'],
	);
	t.deepEqual(
		graph.listChildren(c).map((n) => (n as Person).getName()),
		[],
	);
});
