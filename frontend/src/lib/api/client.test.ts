import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./client";

describe("getErrorMessage", () => {
	it("returns the API message from a JSON error response", async () => {
		const response = new Response(
			JSON.stringify({
				error: { code: "INVALID", message: "Invalid request" },
			}),
			{ headers: { "content-type": "application/json" } },
		);

		await expect(getErrorMessage(response, "Request failed")).resolves.toBe(
			"Invalid request",
		);
	});

	it("returns a short plain-text error response", async () => {
		const response = new Response("Service unavailable");

		await expect(getErrorMessage(response, "Request failed")).resolves.toBe(
			"Service unavailable",
		);
	});

	it("falls back when an error body cannot provide a message", async () => {
		const response = new Response("x".repeat(200));

		await expect(getErrorMessage(response, "Request failed")).resolves.toBe(
			"Request failed",
		);
	});
});
