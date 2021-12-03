require('source-map-support').install();

import test from 'tape';
import { Graph, GraphNode, Link } from '../';

test('test', (t: test.Test) => {
	t.ok(Graph, 'implement Graph');
	t.ok(GraphNode, 'implement GraphNode');
	t.ok(Link, 'implement Link');
	t.end();
});
