import { prerender } from '$app/server';
import { getPost, getPostSlugs, getRelatedPosts } from '$lib/post';
import { error } from '@sveltejs/kit';

export const getPostQuery = prerender(
	'unchecked',
	async (data) => {
		const post = await getPost(data);
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
		const post = getRelatedPosts(data);
		if (!post) {
			return error(404);
		}
		return post;
	},
	{
		inputs: () => getPostSlugs()
	}
);
