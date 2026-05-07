import type { Element, Root } from 'hast';
import { headingRank } from 'hast-util-heading-rank';
import { VFile } from 'vfile';
import { toString } from 'hast-util-to-string';
import MagicString from 'magic-string';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { codeToHast } from 'shiki';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { matter } from 'vfile-matter';
import type { PluginOption } from 'vite';

export function mdToHtml() {
	return {
		name: 'md-to-html',
		async transform(code: string, id: string) {
			if (!id.endsWith('.md') && !id.endsWith('.md?metadata')) {
				return;
			}

			const metadataOnly = id.endsWith('?metadata');
			const baseProcessor = unified()
				.use(remarkParse)
				.use(remarkFrontmatter, { type: 'yaml', marker: '-' })
				.use(() => {
					return (_, file) => {
						matter(file);
					};
				})
				.use(() => {
					return (tree: Root, file) => {
						const text = toString(tree);
						const words = text.trim().split(/\s+/).length;
						file.data.lengthInMinutes = words / 200;
					};
				});

			if (metadataOnly) {
				const file = new VFile({ value: code });

				const tree = baseProcessor.parse(file);

				await baseProcessor.run(tree, file);

				const s = new MagicString(`
					export const data = ${JSON.stringify(file.data)};
				`);

				return {
					code: s.toString(),
					map: s.generateMap({ hires: true })
				};
			}

			const processor = baseProcessor
				.use(remarkGfm)
				.use(remarkRehype, { allowDangerousHtml: true })
				.use(rehypeRaw)
				.use(rehypeSlug)
				.use(rehypeAutolinkHeadings, {
					behavior: 'wrap'
				})
				.use(() => {
					return async (tree: Root) => {
						const promises: Promise<void>[] = [];

						visit(tree, 'element', (node, index, parent) => {
							if (parent && node.tagName === 'pre' && typeof index === 'number') {
								const code = node.children[0] as Element | undefined;

								const className = (code?.properties.className ?? []) as string[];

								const languageClass = className.find((c) => c.startsWith('language-'));

								const lang = languageClass ? languageClass.replace('language-', '') : 'text';

								const value = toString(node);

								const promise = codeToHast(value, {
									lang,
									themes: {
										light: 'github-light',
										dark: 'github-dark'
									}
								}).then((highlighted) => {
									parent.children[index] = highlighted as unknown as Element;
								});

								promises.push(promise);
							}
						});

						await Promise.all(promises);
					};
				})
				.use(() => {
					return (tree: Root) => {
						visit(tree, 'element', (node) => {
							const href = node.properties.href as string;

							if (node.tagName === 'a' && href?.[0] !== '#') {
								node.properties.target = '_blank';
								node.properties.rel = 'noopener';
							}
						});
					};
				})
				.use(() => {
					return (tree: Root, file) => {
						const toc: {
							id: string;
							rank: number;
							title: string;
						}[] = [];

						visit(tree, 'element', (node) => {
							const rank = headingRank(node);
							const id = node.properties.id as string;

							if (rank && id) {
								toc.push({
									id,
									rank,
									title: toString(node)
								});
							}
						});

						file.data.toc = toc;
					};
				})
				.use(rehypeStringify);

			const file = await processor.process(code);

			const s = new MagicString(`export const html = ${JSON.stringify(file.toString())};\n`);

			s.append(`export const data = ${JSON.stringify(file.data)};\n`);

			return {
				code: s.toString(),
				map: s.generateMap({ hires: true })
			};
		}
	} satisfies PluginOption;
}
