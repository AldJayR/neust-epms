/** Quote every cell and neutralize spreadsheet formulas in user-authored text. */
export function csvCell(value: unknown): string {
	let text = value === null || value === undefined ? "" : String(value);
	if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
	return `"${text.replaceAll('"', '""')}"`;
}
