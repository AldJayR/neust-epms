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
import {
	RHFPasswordField,
	RHFSubmitButton,
	RHFTextField,
} from "../components/rhf-auth-fields";
import { Alert } from "../components/ui/alert";
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
		} catch (err) {
			toast.error("Login failed. Please try again.");
			return;
		}

		if (result?.error) {
			setServerError(result.message);
			toast.error("Login failed", { description: result.message });
			return;
		}

		setCachedUser(result.user); // Cache the authenticated user on client

		if (
			isSuperAdmin(result?.user) &&
			(safeRedirectTarget === "/dashboard" ||
				safeRedirectTarget.startsWith("/admin/users"))
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

		await navigate({ to: safeRedirectTarget, replace: true });
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-8">
			<section className="w-full max-w-[480px] rounded-xl px-6 py-6">
				<header className="flex flex-col gap-2">
					<h1 className="text-base leading-6 font-semibold text-black">
						Login to your account
					</h1>
					<p className="text-sm leading-5 text-zinc-600">
						Enter your email below to login to your account
					</p>
				</header>

				{serverError && (
					<Alert variant="destructive" className="mt-4">
						{serverError}
					</Alert>
				)}

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
							labelAction={
								<Link
									to="/login"
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
							className="h-9 w-full rounded-[10px] bg-brand-primary text-sm font-medium text-primary-foreground hover:bg-brand-primary-hover"
						/>
					</div>
				</form>

				<p className="pt-4 text-center text-sm leading-5 text-zinc-600">
					Don&apos;t have an account?{" "}
					<Link
						to="/register"
						className="text-black hover:text-black underline underline-offset-2"
					>
						Register
					</Link>
				</p>
			</section>
		</main>
	);
}
