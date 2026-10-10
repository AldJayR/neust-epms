import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import type { AuthEnv } from "@/middleware/auth.js";
import {
	CreateRevisionRequestSchema,
	ReopenRevisionSchema,
	RevisionListQuery,
	RevisionListSchema,
	RevisionParams,
	RevisionProposalParams,
	RevisionReadinessSchema,
	SaveRevisionResponseSchema,
	VerifyRevisionSchema,
} from "./revisions.schema.js";
import {
	createRevisionRequest,
	listRevisionRequests,
	reopenRevisionRequest,
	revisionReadiness,
	saveRevisionResponse,
	verifyRevisionResponse,
} from "./revisions.service.js";

const app = new OpenAPIHono<AuthEnv>();
const errors = {
	400: {
		content: { "application/json": { schema: ErrorSchema } },
		description: "Invalid request",
	},
	403: {
		content: { "application/json": { schema: ErrorSchema } },
		description: "Forbidden",
	},
	404: {
		content: { "application/json": { schema: ErrorSchema } },
		description: "Not found",
	},
	409: {
		content: { "application/json": { schema: ErrorSchema } },
		description: "Proposal or feedback changed",
	},
};
const success = {
	content: {
		"application/json": { schema: z.object({ message: z.string() }) },
	},
	description: "Saved",
};

app.openapi(
	createRoute({
		method: "get",
		path: "/proposals/{id}/revision-requests",
		tags: ["Proposals"],
		security: [{ Bearer: [] }],
		request: { params: RevisionProposalParams, query: RevisionListQuery },
		responses: {
			200: {
				content: { "application/json": { schema: RevisionListSchema } },
				description: "Cross-version revision feedback",
			},
			...errors,
		},
	}),
	async (c) =>
		c.json(
			await listRevisionRequests(
				c.get("user"),
				c.req.valid("param").id,
				c.req.valid("query"),
			),
			200,
		),
);

app.openapi(
	createRoute({
		method: "get",
		path: "/proposals/{id}/revision-readiness",
		tags: ["Proposals"],
		security: [{ Bearer: [] }],
		request: { params: RevisionProposalParams },
		responses: {
			200: {
				content: { "application/json": { schema: RevisionReadinessSchema } },
				description: "Response and document readiness",
			},
			...errors,
		},
	}),
	async (c) =>
		c.json(
			await revisionReadiness(c.get("user"), c.req.valid("param").id),
			200,
		),
);

app.openapi(
	createRoute({
		method: "post",
		path: "/proposals/{id}/revision-requests",
		tags: ["Proposals"],
		security: [{ Bearer: [] }],
		request: {
			params: RevisionProposalParams,
			body: {
				content: {
					"application/json": { schema: CreateRevisionRequestSchema },
				},
			},
		},
		responses: { 200: success, ...errors },
	}),
	async (c) => {
		await createRevisionRequest(
			c.get("user"),
			c.req.valid("param").id,
			c.req.valid("json"),
			getClientIp(c),
		);
		return c.json({ message: "Revision request created" }, 200);
	},
);

app.openapi(
	createRoute({
		method: "put",
		path: "/proposals/{id}/revision-requests/{requestId}/response",
		tags: ["Proposals"],
		security: [{ Bearer: [] }],
		request: {
			params: RevisionParams,
			body: {
				content: { "application/json": { schema: SaveRevisionResponseSchema } },
			},
		},
		responses: { 200: success, ...errors },
	}),
	async (c) => {
		const { id, requestId } = c.req.valid("param");
		await saveRevisionResponse(
			c.get("user"),
			id,
			requestId,
			c.req.valid("json"),
			getClientIp(c),
		);
		return c.json({ message: "Draft response saved" }, 200);
	},
);

app.openapi(
	createRoute({
		method: "post",
		path: "/proposals/{id}/revision-requests/{requestId}/verify",
		tags: ["Proposals"],
		security: [{ Bearer: [] }],
		request: {
			params: RevisionParams,
			body: {
				content: { "application/json": { schema: VerifyRevisionSchema } },
			},
		},
		responses: { 200: success, ...errors },
	}),
	async (c) => {
		const { id, requestId } = c.req.valid("param");
		await verifyRevisionResponse(
			c.get("user"),
			id,
			requestId,
			c.req.valid("json"),
			getClientIp(c),
		);
		return c.json({ message: "Verification recorded" }, 200);
	},
);

app.openapi(
	createRoute({
		method: "post",
		path: "/proposals/{id}/revision-requests/{requestId}/reopen",
		tags: ["Proposals"],
		security: [{ Bearer: [] }],
		request: {
			params: RevisionParams,
			body: {
				content: { "application/json": { schema: ReopenRevisionSchema } },
			},
		},
		responses: { 200: success, ...errors },
	}),
	async (c) => {
		const { id, requestId } = c.req.valid("param");
		await reopenRevisionRequest(
			c.get("user"),
			id,
			requestId,
			c.req.valid("json"),
			getClientIp(c),
		);
		return c.json({ message: "Revision request reopened" }, 200);
	},
);

export default app;
