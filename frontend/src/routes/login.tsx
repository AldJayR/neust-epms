import {
	createFileRoute,
	Link,
	useNavigate,
	redirect,
} from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldGroup } from "../components/ui/field";
import { Alert } from "../components/ui/alert";
import { loginFn } from "../lib/auth.functions";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "../lib/admin.functions";
import {
	RHFPasswordField,
	RHFSubmitButton,
	RHFTextField,
} from "../components/rhf-auth-fields";

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		redirect: z.string().optional(),
	}),
	beforeLoad: ({ context, search }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: search.redirect || "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const { queryClient } = Route.useRouteContext();
	const { redirect: redirectUrl } = Route.useSearch();
	const safeRedirectTarget = redirectUrl?.startsWith("/")
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

		try {
			const result = await loginFn({ data });

			if (result && result.error) {
				setServerError(result.message);
				toast.error("Login failed", { description: result.message });
				return;
			}

			if (
				result?.user?.roleName === "Super Admin" &&
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
		} catch (err) {
			console.error(err);
			toast.error("An unexpected error occurred");
		}
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8">
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
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit(onSubmit)(e);
					}}
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
								<a
									href="#"
									className="text-sm leading-5 text-black hover:text-black hover:underline"
								>
									Forgot password?
								</a>
							}
						/>
					</FieldGroup>

					<div className="mt-7">
						<RHFSubmitButton
							label="Login"
							isSubmitting={form.formState.isSubmitting}
							className="h-9 w-full rounded-[10px] bg-[#14369c] text-sm font-medium text-[#fafafa] hover:bg-[#11308a]"
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
