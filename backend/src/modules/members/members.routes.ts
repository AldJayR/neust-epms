import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import type { AuthEnv } from "@/middleware/auth.js";
import {
	AddMemberSchema,
	MemberListSchema,
	MemberParam,
	MemberSchema,
	PaginationQuery,
	ProposalParam,
} from "./members.schema.js";
import { addMember, listMembers, removeMember } from "./members.service.js";

const app = new OpenAPIHono<AuthEnv>();

// Auth for /proposals/* is registered once at the root app (see app.ts).

// ── GET /proposals/:proposalId/members ──
const listMembersRoute = createRoute({
	method: "get",
	path: "/proposals/{proposalId}/members",
	tags: ["Members"],
	summary: "List members of a proposal",
	security: [{ Bearer: [] }],
	request: { params: ProposalParam, query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: MemberListSchema } },
			description: "List of members",
		},
	},
});

app.openapi(listMembersRoute, async (c) => {
	const { proposalId } = c.req.valid("param");
	const query = c.req.valid("query");
	const result = await listMembers(c.get("user"), proposalId, query);
	return c.json(result, 200);
});

// ── POST /proposals/:proposalId/members ──
const addMemberRoute = createRoute({
	method: "post",
	path: "/proposals/{proposalId}/members",
	tags: ["Members"],
	summary: "Add a member to a proposal (project leader only)",
	security: [{ Bearer: [] }],
	request: {
		params: ProposalParam,
		body: {
			content: { "application/json": { schema: AddMemberSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: MemberSchema } },
			description: "Member added",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not project leader",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal or user not found",
		},
	},
});

app.openapi(addMemberRoute, async (c) => {
	const authUser = c.get("user");
	const { proposalId } = c.req.valid("param");
	const body = c.req.valid("json");
	const ipAddress = getClientIp(c);
	const result = await addMember(authUser, proposalId, body, ipAddress);
	return c.json(result, 201);
});

// ── DELETE /proposals/:proposalId/members/:memberId ──
const removeMemberRoute = createRoute({
	method: "delete",
	path: "/proposals/{proposalId}/members/{memberId}",
	tags: ["Members"],
	summary: "Remove a member from a proposal (project leader only)",
	security: [{ Bearer: [] }],
	request: { params: MemberParam },
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Member removed",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not project leader",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(removeMemberRoute, async (c) => {
	const authUser = c.get("user");
	const { proposalId, memberId } = c.req.valid("param");
	const ipAddress = getClientIp(c);
	await removeMember(authUser, proposalId, memberId, ipAddress);
	return c.json({ message: "Member removed" }, 200);
});

export default app;
