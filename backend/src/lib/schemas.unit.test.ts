import { describe, expect, it } from "vitest";
import { ParamId, PaginationQuery } from "./schemas.js";

describe("common schemas", () => {
	it("coerces pagination query values and applies defaults", () => {
		expect(PaginationQuery.parse({ limit: "10" })).toEqual({ page: 1, limit: 10 });
	});

	it("rejects pagination values outside their supported bounds", () => {
		expect(PaginationQuery.safeParse({ page: 0, limit: 101 }).success).toBe(false);
	});

	it("accepts UUID path parameters and rejects non-UUIDs", () => {
		expect(
			ParamId.safeParse({ id: "123e4567-e89b-12d3-a456-426614174000" }).success,
		).toBe(true);
		expect(ParamId.safeParse({ id: "not-an-id" }).success).toBe(false);
	});
});
