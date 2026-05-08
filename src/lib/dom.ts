import { leaveView } from '@duydang2311/sveltecraft';
import type { Attachment } from 'svelte/attachments';

export function viewTransition<T extends HTMLElement>(name: string): Attachment<T> {
	return (node) => {
		node.style.viewTransitionName = name;
		return leaveView(node, (node: T) => {
			node.style.viewTransitionName = 'none';
			return () => {
				node.style.viewTransitionName = name;
			};
		});
	};
}
