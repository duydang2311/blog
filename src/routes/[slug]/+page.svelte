<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { IconChevronLeft, IconChevronRight } from '$lib/components/icons';
	import { viewTransition } from '$lib/dom';
	import { getPostQuery, getRelatedPostsQuery } from './__page__/page.remote';

	const relatedPostsQuery = $derived(getRelatedPostsQuery(page.params.slug!));
	const post = $derived(await getPostQuery(page.params.slug!));

	function clickHeading(e: MouseEvent) {
		e.preventDefault();
		const id = (e.currentTarget as HTMLAnchorElement).getAttribute('href')?.slice(1);
		if (!id) {
			return;
		}

		history.replaceState(null, '', `#${id}`);
		document.getElementById(id)?.scrollIntoView({
			behavior: 'smooth'
		});
	}
</script>

<svelte:head>
	<title>{post.data.matter.title}</title>
	<meta name="author" content={post.data.matter.title} />
	<meta name="description" content={post.data.matter.description} />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="{env.PUBLIC_SITE_ORIGIN}/{page.params.slug}" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={post.data.matter.title} />
	<meta property="og:description" content={post.data.matter.description} />
	<meta property="og:url" content="{env.PUBLIC_SITE_ORIGIN}/{page.params.slug}" />
	<meta property="og:image" content="{env.PUBLIC_SITE_ORIGIN}/favicon.svg" />
	<meta property="og:logo" content="{env.PUBLIC_SITE_ORIGIN}/favicon.svg" />
	<meta property="og:site_name" content="duyda blog" />
	<meta property="article:published_time" content={post.data.matter.publish_date} />
	<meta property="article:author" content={post.data.matter.author} />
</svelte:head>

<main>
	<div class="flex gap-8 p-4">
		<div class="hidden flex-1 lg:block"></div>
		<div class="mx-auto max-w-full">
			<article class="prose">
				<h1 class="mb-2! leading-none" {@attach viewTransition(`post-slug-${page.params.slug}`)}>
					{post.data.matter.title}
				</h1>
				<p class="not-prose text-sm text-fg-muted">
					<span>{post.data.matter.author}</span>
					<span>
						· {new Date(post.data.matter.publish_date).toLocaleDateString('en', {
							dateStyle: 'medium'
						})}
					</span>
					<span>· {Math.ceil(post.data.lengthInMinutes)}min</span>
				</p>
				<div class="not-prose mt-8 lg:hidden">
					<p class="font-display text-sm font-semibold text-fg-emph">On this page</p>
					<ol class="mt-2 space-y-2 text-sm">
						{#each post.data.toc as item (item.id)}
							<li
								class="flex items-center gap-4 text-fg-muted hover:text-fg"
								style="padding-inline-start: {(item.rank - 2) * 1}rem;"
							>
								<a href="#{item.id}" onclick={clickHeading}>
									{item.title}
								</a>
								<div class="h-px flex-1 bg-surface-border"></div>
							</li>
						{/each}
					</ol>
				</div>
				<div
					{@attach (node) => {
						const anchors = node.querySelectorAll(
							':is(h1,h2,h3,h4,h5,h6) a'
						) as NodeListOf<HTMLAnchorElement>;
						for (const anchor of anchors) {
							anchor.addEventListener('click', clickHeading);
						}
						return () => {
							for (const anchor of anchors) {
								anchor.removeEventListener('click', clickHeading);
							}
						};
					}}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html post.html}
				</div>
			</article>
		</div>
		<div class="hidden flex-1 text-sm lg:block">
			<div class="sticky top-8 mt-28 h-fit pl-4">
				<p class="font-display text-sm font-semibold text-fg-emph">On this page</p>
				<ol class="mt-4 space-y-2">
					{#each post.data.toc as item (item.id)}
						<li
							class="text-fg-muted hover:text-fg"
							style="padding-inline-start: {(item.rank - 2) * 1}rem;"
						>
							<a href="#{item.id}" onclick={clickHeading}>
								{item.title}
							</a>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</div>
</main>
<footer>
	<div class="px-8">
		<div class="mx-auto max-w-[65ch] border-t border-t-surface-border py-8">
			{#if relatedPostsQuery.current}
				{@const relatedPosts = relatedPostsQuery.current}
				<div class="flex items-center justify-between gap-8">
					{#if relatedPosts.older}
						<a
							href={resolve('/[slug]', { slug: relatedPosts.older.slug })}
							class="flex items-center overflow-hidden text-sm text-fg-muted hover:text-fg-emph"
						>
							<IconChevronLeft class="shrink-0" />
							<span class="overflow-hidden text-nowrap text-ellipsis">
								{relatedPosts.older.data.matter.title}
							</span>
						</a>
					{/if}
					{#if relatedPosts.newer}
						<a
							data-align-right={relatedPosts.older == null ? '' : undefined}
							href={resolve('/[slug]', { slug: relatedPosts.newer.slug })}
							class="flex items-center justify-end overflow-hidden text-sm text-fg-muted hover:text-fg-emph data-align-right:ml-auto"
						>
							<span class="overflow-hidden text-nowrap text-ellipsis">
								{relatedPosts.newer.data.matter.title}
							</span>
							<IconChevronRight class="shrink-0" />
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</footer>
