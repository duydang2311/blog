import { prerender } from '$app/server';
import { getPost, getPostSlugs } from '$lib/post';
import { error } from '@sveltejs/kit';

export const getPostQuery = prerender(
	'unchecked',
	async (data) => {
		const slug = data as string;
		const post = await getPost(slug);
		if (!post) {
			return error(404);
		}
		return post;
	},
	{
		inputs: () => getPostSlugs()
	}
);
