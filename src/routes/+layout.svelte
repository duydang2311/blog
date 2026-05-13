<script lang="ts">
	import '@fontsource-variable/google-sans';
	import '@fontsource-variable/lora';
	import './layout.css';

	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	const { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onMount(() => {
		const match = window.matchMedia('(prefers-color-scheme: dark)');
		match.addEventListener('change', (e) => {
			if (e.matches) {
				document.documentElement.setAttribute('data-theme', 'dark');
			} else {
				document.documentElement.removeAttribute('data-theme');
			}
		});
	});
</script>

{@render children()}
