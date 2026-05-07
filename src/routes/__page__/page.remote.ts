import { prerender } from '$app/server';
import { getPosts } from '$lib/post';

export const getPostsQuery = prerender(() => {
	return getPosts();
});
