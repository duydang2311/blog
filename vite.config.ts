import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import { mdToHtml } from './src/lib/plugins/md-to-html.ts';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), mdToHtml(), Icons({ compiler: 'svelte' })]
});
