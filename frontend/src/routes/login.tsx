import { zodResolver } from "@hookform/resolvers/zod";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { isSuperAdmin } from "@/lib/permissions";
import { AuthPageLayout } from "../components/custom/auth-page-layout";
import {
	RHFPasswordField,
	RHFSubmitButton,
	RHFTextField,
} from "../components/rhf-auth-fields";
import { FieldGroup } from "../components/ui/field";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "../lib/admin.functions";
import type { AuthUser } from "../lib/auth";
import { loginFn } from "../lib/auth.functions";
import { setCachedUser } from "../lib/auth-cache";

const loginSchema = z.object({
	email: z.email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		redirect: z.string().optional(),
	}),
	beforeLoad: ({ context, search }) => {
		if (context.auth.isAuthenticated) {
			// Only allow relative, single-slash paths to avoid open redirects.
			const target =
				search.redirect?.startsWith("/") && !search.redirect.startsWith("//")
					? search.redirect
					: "/dashboard";
			throw redirect({ to: target });
		}
	},
	pendingComponent: () => null,
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const { queryClient } = Route.useRouteContext();
	const { redirect: redirectUrl } = Route.useSearch();
	const safeRedirectTarget =
		redirectUrl?.startsWith("/") && !redirectUrl.startsWith("//")
			? redirectUrl
			: "/dashboard";
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof loginSchema>>({
		resolver: zodResolver(loginSchema),
		mode: "onBlur",
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(data: z.infer<typeof loginSchema>) {
		setServerError(null);

		let result:
			| { error: true; message: string }
			| { error: false; user: AuthUser }
			| undefined;
		try {
			result = await loginFn({ data });
		} catch {
			toast.error("Login failed. Please try again.");
			return;
		}

		if (result?.error) {
			setServerError(result.message);
			toast.error("Login failed", { description: result.message });
			return;
		}

		setCachedUser(result.user); // Cache the authenticated user on client

		const isSA = isSuperAdmin(result?.user);
		const target =
			isSA && safeRedirectTarget === "/dashboard" ? "/admin/users" : safeRedirectTarget;

		if (
			isSA &&
			(target === "/admin/users" || safeRedirectTarget.startsWith("/admin/users"))
		) {
			await Promise.all([
				queryClient.prefetchQuery(adminStatsQueryOptions()),
				queryClient.prefetchQuery(
					adminUsersQueryOptions({
						page: 1,
						pageSize: 10,
					}),
				),
			]);
		}

		await navigate({ to: target, replace: true });
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8">
			<AuthPageLayout
				title="Login to your account"
				description="Enter your email below to login to your account"
				error={serverError}
				footer={
					<>
						Don&apos;t have an account?{" "}
						<Link
							to="/register"
							className="text-black hover:text-black underline underline-offset-2"
						>
							Register
						</Link>
					</>
				}
			>
				<form
					className="mt-6"
					method="POST"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup>
						<RHFTextField
							control={form.control}
							name="email"
							label="Email"
							type="email"
							placeholder="m@example.com"
						/>
						<RHFPasswordField
							control={form.control}
							name="password"
							label="Password"
							placeholder="Enter your password"
							labelAction={
								<Link
									to="/forgot-password"
									className="text-sm leading-5 text-black hover:text-black hover:underline"
								>
									Forgot password?
								</Link>
							}
						/>
					</FieldGroup>

					<div className="mt-7">
						<RHFSubmitButton
							label="Login"
							isSubmitting={form.formState.isSubmitting}
							className="h-9 w-full rounded-lg bg-brand-primary text-sm font-medium text-primary-foreground hover:bg-brand-primary-hover"
						/>
					</div>
				</form>
			</AuthPageLayout>
		</main>
	);
}
