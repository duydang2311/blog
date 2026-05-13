import type { Handle } from '@sveltejs/kit';

export const handle: Handle = (e) => {
	let theme = e.event.cookies.get('theme');
	theme = theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : 'system';
	return e.resolve(e.event, {
		transformPageChunk: (input) => input.html.replace(/%app\.theme%/g, theme)
	});
};
