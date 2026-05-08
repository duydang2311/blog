---
title: Don't cross-fade out-of-view elements in your View Transition
author: duyda
description: Don't cross-fade out-of-view elements. Instead, make your transition viewport-aware.
publish_date: 2026-05-09
---

## So, what is the problem...?

An out-of-view element is simply an element outside the current viewport. With the View Transition API, these elements can still get crossfaded during transitions.

That results in unexpected motion where off-screen elements move around or fade across the page. It looks glitchy and feels distracting, especially on long scrolling pages.

Therefore, I think only visible elements should participate in the transition.

## Viewport-aware View Transition

A viewport-aware View Transition simply means: only elements currently visible in the viewport get to participate in the transition.

The name sounds fancy, but the idea is actually super simple: temporarily disable view-transition-name once an element goes out of view. Thankfully, [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) makes it really easy.

Here's a quick and naive example in Svelte using an attachment:

```svelte
<script lang="ts">
	function viewTransition(node: HTMLElement, name: string) {
		const observer = new IntersectionObserver(([entry]) => {
			node.style.viewTransitionName = entry?.isIntersecting ? name : 'none';
		});
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<div {@attach viewTransition('title')}>...</div>
```

And honestly, this works well, though it lacks proper clean-up.

But once you start doing this for multiple elements across different pages, things get repetitive real fast. Every element creates its own observer, clean-up logic gets duplicated, and the whole thing becomes harder to maintain.

A better approach is creating a utility that:

- reuses `IntersectionObserver` as much as possible for elements sharing the same options
- handles cleanup automatically
- disconnects itself once nothing is being observed anymore

And I built one like that to make viewport-aware transitions feel effortless.

## Welcome to the `leaveView` utility

I first noticed this issue while building this very long-scrolling blog.

During view transitions, elements were cross-fading from outside the viewport, and honestly... it looked pretty weird. Not exactly the kind of motion I expect and want my readers noticing.

So I ended up building a small utility for it, now available in [@duydang2311/sveltecraft](https://npmx.dev/package/@duydang2311/sveltecraft) since v0.0.6.

The utility we'll care about, called `leaveView`, is a small general-purpose attachment that runs whenever an element leaves the viewport, then optionally returns a clean-up function that runs once the element comes back into view again.

```svelte
<script lang="ts">
    import { leaveView } from '@duydang2311/sveltecraft';
</script>

<!-- overload 1: leaveView(attachment) -->
<div style:view-transition-name="post-title" {@attach leaveView((node: HTMLDivElement) => {
    node.style.viewTransitionName = 'none';
    return () => {
        node.style.viewTransitionName = 'post-title';
    };
})}>
    ...
</div>

<!-- overload 2: leaveView(node, attachment) -->
<!-- better typescript type inferrence -->
<div style:view-transition-name="post-title" {@attach node => leaveView(node, node => {
    node.style.viewTransitionName = 'none';
    return () => {
        node.style.viewTransitionName = 'post-title';
    };
})}>
    ...
</div>
```

And because the utility internally reuses observers, you also get a few nice bonuses for free:

- one shared observer for elements using the same options
- cleanup handling
- observer disconnection once nothing is being observed anymore

That said, `leaveView` is still intentionally general-purpose. So for this specific View Transition use case, we can make the API even nicer.

Something like this:

```ts
// dom.ts
export function viewTransition<T extends HTMLElement>(name: string): Attachment<T> {
	return (node) => {
	    // this won't be able to run during SSR or non-JS browser
		// but guess what
		// it's fine because View Transition API requires JS anyway
		node.style.viewTransitionName = name;
		return leaveView(node, (node: T) => {
			node.style.viewTransitionName = 'none';
			return () => {
				node.style.viewTransitionName = name;
			};
		});
	};
}
```

```svelte
<script lang="ts">
    import { viewTransition } from './dom';
</script>

<div {@attach viewTransition('post-title')}>...</div>
```

Bang! Just like that, your transition became much more consistent.

If you enjoy this, why not try giving my other Svelte utilities a try too?

All available on [@duydang2311/sveltecraft](https://npmx.dev/package/@duydang2311/sveltecraft).
