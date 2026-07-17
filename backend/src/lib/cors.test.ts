import { describe, expect, it } from "vitest";
import { parseCorsOrigins } from "./cors.js";

describe("parseCorsOrigins", () => {
	it("uses local origins by default outside production", () => {
		expect(parseCorsOrigins(undefined, "development")).toEqual([
			"http://localhost:3001",
			"http://localhost:5173",
		]);
	});

	it("requires explicit origins in production", () => {
		expect(() => parseCorsOrigins(undefined, "production")).toThrow(
			/CORS_ORIGINS/,
		);
	});

	it("parses and validates exact origins", () => {
		expect(
			parseCorsOrigins(
				"https://app.example.com, https://admin.example.com",
				"production",
			),
		).toEqual(["https://app.example.com", "https://admin.example.com"]);
	});

	it("rejects wildcard and path origins", () => {
		expect(() => parseCorsOrigins("*", "production")).toThrow(/origin/);
		expect(() =>
			parseCorsOrigins("https://app.example.com/path", "production"),
		).toThrow(/origin/);
	});
});
