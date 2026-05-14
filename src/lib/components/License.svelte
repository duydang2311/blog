<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	const { ...props }: HTMLAttributes<HTMLParagraphElement> = $props();
</script>

<p {...props}>
	<a
		href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
		target="_blank"
		rel="noopener"
		class="c-link transition"
	>
		CC BY-NC-SA 4.0
	</a>
	<span>2026-PRESENT © Dang Quoc Duy</span>
</p>
