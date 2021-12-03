# property-graph

> **NOTE:** This package is experimental and still under development.

Base for creating objects that behave like a Property Graph.

## Overview

The `property-graph` package is intended as a foundation for libraries (similar to glTF-Transform) requiring many custom types of compatible parts, which can be represented as a [Property Graph](https://www.dataversity.net/what-is-a-property-graph/#) (useful for dependency chains, node-based shaders, and other resource graphs). The package can represent any [labeled, directed multigraph](https://en.wikipedia.org/wiki/Multigraph#Labeling), including attributes on both graph nodes and edges.

Beyond that, the package is intended to be small and practical, rather than providing a large standard library for graph theory — if you need that, I'd suggest [`graphology`](https://graphology.github.io/). Typically, you'll define one or more classes inheriting from the base `GraphNode`. When using TypeScript, an interface can be provided defining the kinds of connections the graph node allows. Then, `.set` and `.get` methods may be used to set literal attributes (strings, numbers, booleans, ...), and `.getRef` and `setRef` methods may be used to create links or references to other `GraphNodes` of a compatible type. All references are labeled, and type-safe:

**Definitions:**

```typescript
interface IPerson {
  name: string;
  age: number;
  friends: Person[];
  pet: Pet;
}

interface IPet {
  type: 'dog' | 'cat';
  name: string;
}

class Person extends GraphNode<IPerson> {
	getDefaults(): Nullable<IPerson> {
		return {name: '', age: 0, friends: [], pet: null};
	}
}
class Pet extends GraphNode<IPet> {
	getDefaults(): Nullable<IPet> {
		return {type: 'dog', name: ''};
	}
}
```

**Usage:**

```typescript
const graph = new Graph();

const spot = new Pet(graph)
  .set('type', 'dog')
  .set('name', 'Spot');

const jo = new Person(graph)
  .set('name', 'Jo')
  .set('age', 41)
  .setRef('pet', spot);

const sam = new Person(graph)
  .set('name', 'Sam')
  .set('age', 45)
  .addRef('friend', jo);
```

The library can be used for both TypeScript and JavaScript projects, but type-checking is only enforced in TypeScript — it does not provide runtime type-checking. Adding custom getters and setters to GraphNode subclasses is often a good idea, and can be used to include additional validation or more complex behaviors.

Compared to plain getters/setters, this approach makes management of object lifecycles considerably easier:

- GraphNode references are tracked, and can be traversed up or down the graph as needed
- GraphNode disposal automatically cleans up incoming references from other nodes
- Locating all nodes that refer _to_ a given node, or that have references _from_ a given node, is trivial
- Change detection can be enabled on any node attribute or reference, and propagated up or down the graph *(planned)*
- Replacing references to `X` with `Y` does not require complete knowledge of all GraphNode types and their references
- Operations like `.copy()` and `.equals()` can be implemented abstractly

**Lifecycle example:**

```typescript
jo.equals(sam); // recursive equality → false

console.log(sam.listRefs('friends')); // → [jo]

jo.dispose();

console.log(sam.listRefs('friends')); // → []
```
