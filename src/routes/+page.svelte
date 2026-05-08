<script lang="ts">
	import { resolve } from '$app/paths';
	import { viewTransition } from '$lib/dom';
	import { getPostsQuery } from './__page__/page.remote';

	const posts = $derived(await getPostsQuery());
</script>

<svelte:head>
	<title>blog</title>
</svelte:head>

<main class="px-4 py-16">
	<div class="mx-auto max-w-2xl">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between">
			<div class="flex items-center gap-2 max-md:justify-center">
				<img
					src="/favicon.svg"
					alt="duydang pfp"
					class="size-12 rounded-lg"
					{@attach viewTransition('app-pfp')}
				/>
				<h1 class="text-4xl font-semibold text-fg-emph" {@attach viewTransition('app-blog')}>
					blog
				</h1>
			</div>
			<p class="mt-4 text-right text-sm text-fg-muted max-md:text-center md:max-w-48">
				thoughts on software, code, and things in general.
			</p>
		</div>
		<div class="mt-16 max-md:text-center">
			<p class="text-sm text-fg-muted">
				<span>Latest posts</span>
				<span class="ml-1 rounded-sm bg-base px-1.5">{posts.length}</span>
			</p>
			<ol class="mt-4 space-y-4">
				{#each posts as [slug, post] (post.data.matter.title)}
					<li>
						<a
							href={resolve('/[slug]', { slug })}
							class="group flex flex-col gap-x-4 md:flex-row md:items-center"
						>
							<p
								class="text-fg group-hover:text-fg-emph"
								{@attach viewTransition(`post-slug-${slug}`)}
							>
								{post.data.matter.title}
							</p>
							<p class="text-sm text-fg-muted group-hover:text-fg-dim">
								<span>
									{new Date(post.data.matter.publish_date).toLocaleDateString('en', {
										dateStyle: 'medium'
									})}
								</span>
								<span>· {Math.ceil(post.data.lengthInMinutes)} min read</span>
							</p>
						</a>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</main>
