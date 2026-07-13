import { describe, expect, it } from "vitest";
import {
	createArchiveRestoreItem,
	getArchiveRestoreId,
} from "./archive-helpers";

describe("archive helpers", () => {
	it("keeps the selected item and tab-specific restore mapping", () => {
		const item = createArchiveRestoreItem("moa-1", "moa", "Partner MOA");
		expect(item).toEqual({ id: "moa-1", type: "moa", title: "Partner MOA" });
		expect(getArchiveRestoreId(item)).toBe("moa-1");
	});
});
