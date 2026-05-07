export interface PostMetadata {
	data: {
		matter: {
			slug: string;
			title: string;
			author: string;
			description: string;
			publish_date: string;
		};
		lengthInMinutes: number;
		toc: {
			id: string;
			rank: number;
			title: string;
		}[];
	};
}

export interface Post extends PostMetadata {
	html: string;
}

const importPosts = Object.entries(import.meta.glob('./data/posts/*/en.md')).reduce(
	(acc, cur) => {
		const slug = cur[0].split('/', 4)[3];
		if (!slug) {
			return acc;
		}
		acc[slug] = cur[1] as () => Promise<Post>;
		return acc;
	},
	{} as Record<string, () => Promise<Post>>
);

export async function getPost(slug: string) {
	const importPost = importPosts[slug];
	if (!importPost) {
		return;
	}
	return await importPost();
}

export function getPostSlugs() {
	return Object.keys(importPosts);
}

export function getPosts() {
	const posts = Object.entries(
		import.meta.glob('./data/posts/*/en.md', { eager: true, query: '?metadata' })
	).reduce(
		(acc, cur) => {
			const slug = cur[0].split('/', 4)[3];
			if (!slug) {
				return acc;
			}
			acc[slug] = cur[1] as PostMetadata;
			return acc;
		},
		{} as Record<string, PostMetadata>
	);
	return posts;
}
