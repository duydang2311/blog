import { getPostSlugs } from '$lib/post';
import type { EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
	return getPostSlugs().map((slug) => ({ slug }));
};
