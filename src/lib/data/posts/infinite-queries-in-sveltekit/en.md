---
slug: infinite-queries-in-sveltekit
title: Infinite Queries in SvelteKit
author: duyda
description: Steps to implement infinite queries in SvelteKit using remote functions.
publish_date: 2026-05-08
---

## What is an infinite query?

Infinite query is a pretty common data-fetching pattern where you load data page by page as the user keeps scrolling or requesting more results, instead of fetching everything at once.

You've probably already seen this everywhere already: Twitter feeds, Instagram posts, YouTube comments, etc... content just keeps loading as you scroll down.

In this post, I'll share about a simple yet efficient way to implement infinite queries with SvelteKit remote functions.

## Why use remote functions?

SvelteKit has been putting a lot of work into [remote functions](https://svelte.dev/docs/kit/remote-functions) recently. At the moment, the feature is still experimental and subject to change, but it already feels complete and reliable. Some things may break here and there between minor version upgrades though, but most of the time it's just small API or parameter changes.

Before remote functions, I usually had to either use a library like [TanStack Query](https://tanstack.com/query/latest) or roll my own crappy data management. And neither felt great honestly (skill issue, probably). TanStack Query is powerful, but it kills your bundle size. Doing it yourself is also painful because you quickly run into annonying edge cases like:

- multiple in-flight requests
- cache invalidation
- optimistic updates
- rollback on failure
- syncing data between components

Remote functions come to the rescue and make it much simpler. You get shared state, caching, mutations, deduplication, optimistic UI, and invalidation built into the framework.

I recommend having some [basic understanding of remote functions](https://svelte.dev/docs/kit/remote-functions) for the best experience.

## Loading data

### Creating a remote paginated query

To implement infinite queries, we first need a paginated query. Any type of pagination works, but for this example we'll use keyset pagination.

Instead of fetching “page 1”, “page 2”, etc..., we ask for the next set of items after a specific item ID.

A simplified remote query could look like this:

```typescript
// todo.remote.ts
import { query } from '$app/server';
import { type } from 'arktype';

type Todo = { id: string; content: string };

export const getTodos = query(
	type({
		limit: 'number',
		'after?': 'string | null'
	}),
	async ({ limit, after }) => {
		// if `after` is null, fetch the first `limit` items
		// otherwise, fetch the next `limit` items after `after`
		const items: Todo[] = await queryTodosFromDB();

		// you typically also need to compute hasNext, hasPrevious
		//
		// common approach:
		// hasPrevious = after != null;
		// hasNext = fetching limit+1 items and length > limit
		//
		// this is just forward pagination though
		// look into `until` cursor for a backward one
		const [hasPrevious, hasNext] = [checkHasPrevious(), checkHasNext()];

		return { items, hasPrevious, hasNext };
	}
);
```

Here:

- `limit` defines how many items we want per request.
- `after` acts as our cursor. When `after` is null, we fetch the initial batch. Otherwise, we fetch the next batch after the given item.
- Your back-end should also let the client know whether there is a previous page or a next page available.

This is the foundation of an infinite query. Every time we need more data, we simply call the same query again with a new cursor. That also means:

- 1 page params = 1 fetched page.
- N fetched pages = N page params.
- Loading more items is really just adding one more page params object to the list.

### Creating client-side page state

At first, it might seem natural to store query results in local state, as we normally would with client-side data fetching. However, with remote functions, we let the framework own the query state.

Instead of storing the results themselves, we only keep track of the page params used to fetch each query and access the data directly from the query instance.

```svelte
<!-- +page.svelte -->
<script lang="ts">
	interface TodoPageParams {
		limit: number;
		after?: string | null;
	}

	let pageParams = $state<TodoPageParams[]>([]);
</script>
```

### Fetching initial page

Now that we have a state for our page params, the next step is to actually call the remote query we just created for data. For the page initial render, let's start with a page of 20 items.

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { getTodos } from './todo.remote';

	let pageParams = $state<TodoPageParams[]>([{ limit: 20 }]);
	const queries = $derived(pageParams.map((params) => getTodos(params)));
</script>
```

Here, our queries are derived from the `pageParams` state using the `$derived` rune. Whenever `pageParams` changes, Svelte automatically re-runs the derived state, which in turn sends new request to the remote query function for the newly added pages.

At this point, the `pageParams` is the source of truth for all page queries. Every time we load another page, we just add a new page params to `pageParams`.

For rendering, though, we are not really interested in the query instances themselves. A flat list of items is your best friend because it is easy to iterate through and gets the work done. With [the experimental async feature](https://svelte.dev/docs/svelte/await-expressions), awaiting for all query promises in a `$derived` and getting actual values out of them becomes very straightforward.

```svelte
<!-- +page.svelte -->
<script lang="ts">
	const lists = $derived(await Promise.all(queries));
	const todos = $derived(lists.flatMap((list) => list.todos));
</script>

<ul>
	{#each todos as todo (todo.id)}
		<li>{todo.content}</li>
	{/each}
</ul>
```

### Fetching next page

To load more items, we simply append a new page params to the state and let the new query runs automatically.

```svelte
<!-- +page.svelte -->
<script lang="ts">
	function loadMore() {
		if (!lists.at(-1)?.hasNext) return;

		const lastTodo = todos.at(-1);
		if (!lastTodo) return;

		pageParams.push({ limit: 20, after: lastTodo.id });
	}
</script>
```

Here:

1. `pageParams.push` adds a new page params and triggers reactivity.
2. `queries` gets re-run. **Old instances are cached** and only a single query for the latest page params will be triggered.

We now have an infinite list that keeps growing as the user scrolls, until they reach the last item.

## Adding new items

Loading data is only half of the story. In a real application, we usually also want to create new items and have the list update automatically.

With remote functions, this becomes surprisingly clean because commands can directly invalidate queries for us.

### Creating a command

Let's create a remote command for inserting a new todo.

```ts
// todo.remote.ts
import { command, query, requested } from '$app/server';
import { type } from 'arktype';

export const addTodo = command(
	type({
		content: 'string'
	}),
	async ({ content }) => {
		// fake database insert
		await insertTodoIntoDB(content);

		// invalidate all getTodos queries created by this request
		await requested(getTodos(), Infinity).refreshAll();

		return { success: true };
	}
);
```

Here, after inserting the todo into the DB, we tell SvelteKit that every active `getTodos` query is now stale and should be invalidated.

### Optimistically calling the command

We can now call the command directly from the client.

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { addTodo } from './todo.remote';

	async function createTodo(content: string) {
		const lastListQuery = queries.at(-1);
		if (!lastListQuery) return;

		const optimisticTodo = {
			id: crypto.randomUUID(),
			content
		};

		await addTodo({ content }).updates(
			lastListQuery.withOverrides((list) => ({
				...list,
				items: [...list.items, optimisticTodo]
			}))
		);
	}
</script>
```

Here, withOverrides temporarily replaces the query result locally while the command is in-flight.

That means:

1. The new todo appears instantly.
2. The command still runs on the server normally.
3. `requested(getTodos(), Infinity).refreshAll()` re-fetches the queries afterward.
4. If the command fails, the optimistic override is automatically rolled back.

#### Edge case: Flickering

A brief flicker can occur when the last page is already full. This happens because the optimistic item is temporarily added, removed, and then added again once `loadMore()` runs.

In most cases, this is harmless because the refreshed query will automatically move the new todo into the correct next page. However, we can make this more seamless and completely avoid the flicker.

Instead of temporarily squeezing 21 items into a page that normally only holds 20, we can increase the page size first so the optimistic update already matches what the server will return later.

The idea is:

1. Clone the last query into a new query with `size + 1`.
2. Copy the current query result into the expanded query.
3. Update the page params to use the larger size.
4. Apply optimistic overrides.
5. Let the server re-fetch the expanded page afterward.

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { addTodo, getTodos } from './todo.remote';

	async function createTodo(content: string) {
		const lastQuery = queries.at(-1);
		if (!lastQuery?.current) return;

		const lastParams = pageParams.at(-1);
		if (!lastParams) return;

		const optimisticTodo = {
			id: crypto.randomUUID(),
			content
		};

		const expandedQuery = getTodos({
			...lastParams,
			limit: lastParams.limit + 1
		});

		// copy the last query over
		expandedQuery.set({
			...lastQuery.current,
			items: [...lastQuery.current.items, optimisticTodo]
		});

		// expand the last page params
		lastParams.limit += 1;

		await addTodo({ content }).updates(
			expandedQuery.withOverrides((list) => ({
				...list,
				items: [...list.items, optimisticTodo]
			}))
		);
	}
</script>
```

## Removing items

Removing items follows the exact same idea. We create a command, invalidate all active queries on the server, then optimistically adjust the page params ahead of time on the client so everything stays smooth while the request is in-flight.

### Creating a command

```ts
// todo.remote.ts
import { command, requested } from '$app/server';
import { type } from 'arktype';

export const removeTodo = command(
	type({
		id: 'string'
	}),
	async ({ id }) => {
		// fake database delete
		await deleteTodoFromDB(id);

		// invalidate all getTodos queries
		await requested(getTodos(), Infinity).refreshAll();

		return { success: true };
	}
);
```

### Optimistically calling the command

This time, instead of expanding the page, we shrink it ahead of time.

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { getTodos, removeTodo } from './todo.remote';

	async function deleteTodo(todoId: string) {
		const lastQuery = queries.at(-1);
		if (!lastQuery?.current) return;

		const lastParams = pageParams.at(-1);
		if (!lastParams) return;

		const shrunkenQuery = getTodos({
			...lastParams,
			limit: lastParams.limit - 1
		});

		// copy the last query over without the removed todo
		shrunkenQuery.set({
			...lastQuery.current,
			items: lastQuery.current.items.filter((todo) => todo.id !== todoId)
		});

		// shrink the last page params
		lastParam.limit -= 1;

		await removeTodo({ id: todoId }).updates(
			shrunkenQuery.withOverrides((list) => ({
				...list,
				items: list.items.filter((todo) => todo.id !== todoId)
			}))
		);
	}
</script>
```

## Updating items

Updating items is the simplest case because we are not mutating page params at all.

### Creating a command

```ts
// todo.remote.ts
import { command, requested } from '$app/server';
import { type } from 'arktype';

export const updateTodo = command(
	type({
		id: 'string',
		content: 'string'
	}),
	async ({ id, content }) => {
		// fake database update
		await updateTodoInDB(id, content);

		// invalidate all getTodos queries
		await requested(getTodos(), Infinity).refreshAll();

		return { success: true };
	}
);
```

### Optimistically calling the command

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { updateTodo } from './todo.remote';

	async function editTodo(todoId: string, content: string) {
		const affectedQuery = queries.find((query) =>
			query.current?.items.some((todo) => todo.id === todoId)
		);

		if (!affectedQuery) return;

		await updateTodo({
			id: todoId,
			content
		}).updates(
			affectedQuery.withOverrides((list) => ({
				...list,
				items: list.items.map((todo) => (todo.id === todoId ? { ...todo, content } : todo))
			}))
		);
	}
</script>
```

That’s pretty much it! Hopefully this saves you some time the next time you need to do this pattern in your project. And if you end up finding a better approach or run into other weird edge cases, feel free to share them too.
