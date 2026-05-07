<script lang="ts">
	import { resolve } from '$app/paths';
	import '@fontsource/dm-mono';

	const { children } = $props();
</script>

<header class="p-4 lg:py-8">
	<div class="mx-auto max-w-2xl">
		<a href={resolve('/')} class="flex items-center gap-1">
			<img
				src="/favicon.svg"
				alt="duydang pfp"
				class="size-6 rounded-md"
				style:view-transition-name="app-pfp"
			/>
			<p class="font-display font-semibold text-fg-emph" style:view-transition-name="app-blog">
				blog
			</p>
		</a>
	</div>
</header>
{@render children()}
