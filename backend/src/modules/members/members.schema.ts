import { z } from "@hono/zod-openapi";
import { PROJECT_ROLES } from "@/lib/project-roles.js";

export const MemberSchema = z
	.object({
		memberId: z.string(),
		proposalId: z.string(),
		userId: z.string(),
		projectRole: z.string(),
		specificRole: z.string().nullable().optional(),
		addedAt: z.string(),
	})
	.openapi("ProposalMember");

export const MemberListSchema = z
	.object({ items: z.array(MemberSchema) })
	.openapi("ProposalMemberList");

export const AddMemberSchema = z
	.object({
		userId: z.string(),
		projectRole: z.enum(PROJECT_ROLES),
		specificRole: z.string().trim().max(100).nullable().optional(),
	})
	.openapi("AddMember");

export const ProposalParam = z.object({
	proposalId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "proposalId", in: "path" },
		}),
});

export const MemberParam = z.object({
	proposalId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "proposalId", in: "path" },
		}),
	memberId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "memberId", in: "path" },
		}),
});

export const PaginationQuery = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({
			param: { name: "page", in: "query" },
		}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.openapi({
			param: { name: "limit", in: "query" },
		}),
});
