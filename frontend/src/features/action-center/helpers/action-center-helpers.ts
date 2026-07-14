import type { ActionItem } from "../functions";

export interface ActionCenterSections {
	actItems: ActionItem[];
	waitItems: ActionItem[];
	watchItems: ActionItem[];
}

const URGENCY_ORDER: Record<ActionItem["urgency"], number> = {
	urgent: 0,
	soon: 1,
	routine: 2,
};

export function sortActionItems(items: ActionItem[]) {
	return [...items].sort((a, b) => {
		const urgencyDifference = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
		if (urgencyDifference !== 0) return urgencyDifference;
		return b.createdAt.localeCompare(a.createdAt);
	});
}

export function partitionActionItems(
	actItems: ActionItem[],
	watchItems: ActionItem[],
): ActionCenterSections {
	const sections: ActionCenterSections = {
		actItems: [],
		waitItems: [],
		watchItems: [],
	};

	for (const item of [...actItems, ...watchItems]) {
		if (item.derivedState === "ACT") {
			sections.actItems.push(item);
		} else if (item.derivedState === "WAIT") {
			sections.waitItems.push(item);
		} else {
			sections.watchItems.push(item);
		}
	}

	return {
		actItems: sortActionItems(sections.actItems),
		waitItems: sortActionItems(sections.waitItems),
		watchItems: sortActionItems(sections.watchItems),
	};
}
