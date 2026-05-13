import { prerender } from '$app/server';
import { getPost, getPostSlugs, getRelatedPosts } from '$lib/post';
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

export const getRelatedPostsQuery = prerender(
	'unchecked',
	(data) => {
		const slug = data as string;
		const post = getRelatedPosts(slug);
		if (!post) {
			return error(404);
		}
		return post;
	},
	{
		inputs: () => getPostSlugs()
	}
);
