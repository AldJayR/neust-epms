import { z } from "@hono/zod-openapi";

export const UserResponseSchema = z
	.object({
		userId: z.string(),
		firstName: z.string(),
		middleName: z.string().nullable(),
		lastName: z.string(),
		nameSuffix: z.string().nullable(),
		academicRank: z.string().nullable(),
		email: z.string().email(),
		roleName: z.string(),
		campusName: z.string(),
		departmentName: z.string().nullable(),
		isActive: z.boolean(),
		hasCompletedOnboarding: z.boolean(),
		roleId: z.number().optional(),
		campusId: z.number().optional(),
		departmentId: z.number().nullable().optional(),
	})
	.openapi("UserResponse");

export const RegisterUserBodySchema = z
	.object({
		firstName: z.string().min(1),
		middleName: z.string().optional(),
		lastName: z.string().min(1),
		nameSuffix: z.string().optional(),
		academicRank: z.string().optional(),
		email: z.string().email(),
		password: z.string().min(8),
		campusId: z.number().int().positive(),
		departmentId: z.number().int().positive().optional(),
	})
	.openapi("RegisterUserBody");

export const CheckPasswordBodySchema = z
	.object({ password: z.string().min(1) })
	.openapi("CheckPasswordBody");

export const CheckPasswordResponseSchema = z
	.object({ compromised: z.boolean() })
	.openapi("CheckPasswordResponse");

export const LoginBodySchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1),
	})
	.openapi("LoginBody");

export const LoginResponseSchema = z
	.object({
		access_token: z.string(),
		refresh_token: z.string(),
		user: UserResponseSchema,
	})
	.openapi("LoginResponse");

export const LogoutResponseSchema = z
	.object({ ok: z.literal(true) })
	.openapi("LogoutResponse");

export const OnboardingCompleteResponseSchema = z.object({
	success: z.boolean(),
});

export const UserSearchQuerySchema = z.object({
	search: z.string().min(1),
});

export const UserSearchResponseSchema = z.array(
	z.object({
		userId: z.string(),
		firstName: z.string(),
		lastName: z.string(),
		email: z.string(),
	}),
);

export const LookupListResponseSchema = z.array(
	z.object({
		id: z.number(),
		name: z.string(),
	}),
);
