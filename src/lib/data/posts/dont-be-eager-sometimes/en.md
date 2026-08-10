---
title: Don't be eager sometimes
author: duyda
description: How to stop eagerly loading conditional views. SSR-compatible approach for SvelteKit users.
publish_date: 2026-08-10
---

_By "eager", I mean the default behavior of conditional rendering we all use._

## Conditional rendering is eager by default

Conditional rendering is a familiar concept: "if this condition is true, show A; otherwise, show B." And this is how we usually do it in Svelte:

```svelte
<script lang="ts">
	import { PageA } from './PageA.svelte';
	import { PageB } from './PageB.svelte';

	const condition: boolean;
</script>

{#if condition}
	<PageA />
{:else}
	<PageB />
{/if}
```

But here's the catch: only the view itself is conditional. Both pages are still fetched eagerly and unconditionally when the component loads, even when your visitor doesn't need the other one.

Imagine you're building a route that serves completely different content depending on who's visiting:

| I am              | The route serves | Content                                                                         |
| ----------------- | ---------------- | ------------------------------------------------------------------------------- |
| An anonymous user | Landing page     | Static & simple content. Spins up a heavy GSAP/motion.js for fancy animations   |
| A logged-in user  | Homepage         | Bunch of rich interactive & complex child components inside, heavy data loading |

In this case, the view isn't likely to toggle. A guest would need to sign in on another page and return to access the protected content. But with eager loading, they still pay the price due to downloading the heavy homepage code they'll never see. The same goes for logged-in users, who end up fetching the landing page's bloated GSAP/motion.js code for no reason.

The good news? There's a better way.

## Taking the eagerness out of conditional rendering

You can use [Vite's dynamic import](https://vite.dev/guide/features#dynamic-import) to lazily load a page only when the condition is met. This way, your users only fetch what they actually need to see, no wasted resources on pages they'll never visit.

```svelte
<script lang="ts">
	const condition: boolean;
</script>

{#if condition}
	{#await import('./PageA.svelte') then { default: PageA }}
		<PageA />
	{/await}
{:else}
	{#await import('./PageB.svelte') then { default: PageB }}
		<PageB />
	{/await}
{/if}
```

That said, you don't want to be lazy all the time. If the view toggles often and the components are relatively cheap, you're better off keeping things eager.

| Approach           | Pros                                                               | Cons                                                                               |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Eager** (static) | Simple, no per-render overhead; great for small, always-used components | Both components bundled & fetched up front; wasteful if the view isn't likely to switch |
| **Lazy** (dynamic) | Component fetched on-demand; saves bandwidth for unseen content    | Slight per-render overhead; not ideal for frequently-toggled views                 |

## Making it work for SSR in SvelteKit

Lazy conditional rendering, however, doesn't play nicely with SSR in SvelteKit. The framework won't server-side render dynamic imports in your markup, so you'll see a flash of blank content before client-side hydration kicks in.

The fix is simple: move the dynamic import to a universal load function (`+page.ts`). This lets the server resolve the import and render the HTML on the first pass, so the client just hydrates what's already there and starts adding interactivity.

```ts
// +page.ts
export const load: PageLoad = async (e) => {
	const condition: boolean;
	return {
		Page: await (condition ? import('./PageA.svelte') : import('./PageB.svelte'))
			.then(({ default }) => default)
	}
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
	const { data } = $props();
</script>

<data.Page />
```

It really bugged me seeing useless page fetches in the network tab, so I came up with this fix. Hope it helps you too!

Happy coding!
