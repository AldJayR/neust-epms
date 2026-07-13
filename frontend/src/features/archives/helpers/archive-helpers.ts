export type ArchiveRestoreType = "proposal" | "project" | "moa";

export interface ArchiveRestoreItem {
	id: string;
	type: ArchiveRestoreType;
	title: string;
}

export function createArchiveRestoreItem(
	id: string,
	type: ArchiveRestoreType,
	title: string,
): ArchiveRestoreItem {
	return { id, type, title };
}

export function getArchiveRestoreId(item: ArchiveRestoreItem): string {
	return item.id;
}
