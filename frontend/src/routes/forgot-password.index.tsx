import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthPageLayout } from "../components/custom/auth-page-layout";
import { RHFSubmitButton, RHFTextField } from "../components/rhf-auth-fields";
import { FieldGroup } from "../components/ui/field";
import { sendResetCodeFn } from "@/features/auth";

const forgotPasswordSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

export const Route = createFileRoute("/forgot-password/")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof forgotPasswordSchema>>({
		resolver: zodResolver(forgotPasswordSchema),
		mode: "onBlur",
		defaultValues: {
			email: "",
		},
	});

	async function onSubmit(data: z.infer<typeof forgotPasswordSchema>) {
		setServerError(null);
		try {
			const result = await sendResetCodeFn({ data });
			if (result.error) {
				setServerError(result.message);
				toast.error("Error", { description: result.message });
				return;
			}

			// Store email in sessionStorage to use in step 2 (OTP verification)
			sessionStorage.setItem("forgot_password_email:v1", data.email);
			toast.success("Success", {
				description: "Reset code sent to your email.",
			});
			await navigate({ to: "/forgot-password/otp" });
		} catch {
			toast.error("Failed to send reset code. Please try again.");
		}
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8">
			<AuthPageLayout
				title="Reset your password"
				description="Enter the email address associated with your account. We'll send a one-time code to that address."
				error={serverError}
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
					</FieldGroup>

					<div className="flex gap-3 items-center justify-end w-full mt-7">
						<Link
							to="/login"
							className="flex h-9 items-center justify-center rounded-lg border border-brand-primary !text-brand-primary text-sm font-medium px-4 hover:bg-zinc-50 transition-colors whitespace-nowrap"
						>
							<ArrowLeft className="mr-2 size-4" />
							Back to login
						</Link>
						<RHFSubmitButton
							label="Send code"
							isSubmitting={form.formState.isSubmitting}
							className="h-9 rounded-lg bg-brand-primary text-sm font-medium text-primary-foreground hover:bg-brand-primary-hover w-[126px]"
						/>
					</div>
				</form>
			</AuthPageLayout>
		</main>
	);
}
