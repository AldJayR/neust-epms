import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthPageLayout } from "../components/custom/auth-page-layout";
import {
	RHFPasswordField,
	RHFSubmitButton,
} from "../components/rhf-auth-fields";
import { FieldGroup } from "../components/ui/field";
import { setNewPasswordFn } from "@/features/auth";

const resetPasswordSchema = z
	.object({
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const Route = createFileRoute("/forgot-password/reset")({
	beforeLoad: () => {
		if (typeof window !== "undefined") {
			const storedEmail = sessionStorage.getItem("forgot_password_email:v1");
			if (!storedEmail) {
				throw redirect({ to: "/forgot-password" });
			}
		}
	},
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof resetPasswordSchema>>({
		resolver: zodResolver(resetPasswordSchema),
		mode: "onBlur",
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(data: z.infer<typeof resetPasswordSchema>) {
		setServerError(null);
		try {
			const result = await setNewPasswordFn({
				data: {
					password: data.password,
				},
			});

			if (result.error) {
				setServerError(result.message);
				toast.error("Error", { description: result.message });
				return;
			}

			toast.success("Success", {
				description: "Password saved successfully. Please log in.",
			});
			sessionStorage.removeItem("forgot_password_email:v1");
			await navigate({ to: "/login" });
		} catch {
			toast.error("Failed to save password. Please try again.");
		}
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8">
			<AuthPageLayout
				title="Set new password"
				description="Choose a strong password for your account. You will be redirected to login after saving."
				error={serverError}
			>
				<form
					className="mt-6"
					method="POST"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup>
						<RHFPasswordField
							control={form.control}
							name="password"
							label="Password"
							placeholder="At least 8 characters"
							description="Password must be at least 8 characters."
						/>
						<RHFPasswordField
							control={form.control}
							name="confirmPassword"
							label="Confirm Password"
							placeholder="Re-enter your password"
						/>
					</FieldGroup>

					<div className="flex w-full mt-7">
						<RHFSubmitButton
							label="Save new password"
							isSubmitting={form.formState.isSubmitting}
							className="h-9 w-full rounded-lg bg-brand-primary text-sm font-medium text-primary-foreground hover:bg-brand-primary-hover"
						/>
					</div>
				</form>
			</AuthPageLayout>
		</main>
	);
}
