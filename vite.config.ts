import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { mdToHtml } from './src/lib/plugins/md-to-html';

export default defineConfig({ plugins: [tailwindcss(), sveltekit(), mdToHtml()] });
