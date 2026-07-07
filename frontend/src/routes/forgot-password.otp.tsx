import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthPageLayout } from "../components/custom/auth-page-layout";
import { RHFSubmitButton } from "../components/rhf-auth-fields";
import { FieldError } from "../components/ui/field";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "../components/ui/input-otp";
import { sendResetCodeFn, verifyResetCodeFn } from "../lib/auth.functions";

const otpSchema = z.object({
	code: z.string().length(6, "Verification code must be 6 digits"),
});

export const Route = createFileRoute("/forgot-password/otp")({
	component: OtpVerificationPage,
});

function OtpVerificationPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);
	const [isResending, setIsResending] = useState(false);

	useEffect(() => {
		const storedEmail = sessionStorage.getItem("forgot_password_email:v1");
		if (!storedEmail) {
			toast.error("No email found. Redirecting back to forgot password page.");
			navigate({ to: "/forgot-password" });
			return;
		}
		setEmail(storedEmail);
	}, [navigate]);

	const form = useForm<z.infer<typeof otpSchema>>({
		resolver: zodResolver(otpSchema),
		mode: "onBlur",
		defaultValues: {
			code: "",
		},
	});

	async function onSubmit(data: z.infer<typeof otpSchema>) {
		setServerError(null);
		try {
			const result = await verifyResetCodeFn({
				data: {
					email,
					code: data.code,
				},
			});

			if (result.error) {
				setServerError(result.message);
				toast.error("Error", { description: result.message });
				return;
			}

			toast.success("Success", { description: "Verification successful." });
			await navigate({ to: "/forgot-password/reset" });
		} catch {
			toast.error("Verification failed. Please try again.");
		}
	}

	async function handleResendCode() {
		if (isResending) return;
		setIsResending(true);
		try {
			const result = await sendResetCodeFn({ data: { email } });
			if (result.error) {
				toast.error("Resend Failed", { description: result.message });
				return;
			}
			toast.success("Resent", {
				description: "A new code has been sent to your email.",
			});
		} catch {
			toast.error("Failed to resend code. Please try again.");
		} finally {
			setIsResending(false);
		}
	}

	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8">
			<AuthPageLayout
				title="Enter verification code"
				description={`A 6-digit code was sent to ${email || "your email"}. Enter it below. The code expires in 10 minutes.`}
				error={serverError}
			>
				<form
					className="mt-6 space-y-6"
					method="POST"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<div className="flex flex-col items-center justify-center gap-3">
						<Controller
							control={form.control}
							name="code"
							render={({ field }) => (
								<InputOTP
									maxLength={6}
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
								>
									<InputOTPGroup className="gap-2">
										<InputOTPSlot
											index={0}
											className="w-12 h-12 text-lg rounded-md border border-zinc-300 bg-background shadow-xs text-center"
										/>
										<InputOTPSlot
											index={1}
											className="w-12 h-12 text-lg rounded-md border border-zinc-300 bg-background shadow-xs text-center"
										/>
										<InputOTPSlot
											index={2}
											className="w-12 h-12 text-lg rounded-md border border-zinc-300 bg-background shadow-xs text-center"
										/>
										<InputOTPSlot
											index={3}
											className="w-12 h-12 text-lg rounded-md border border-zinc-300 bg-background shadow-xs text-center"
										/>
										<InputOTPSlot
											index={4}
											className="w-12 h-12 text-lg rounded-md border border-zinc-300 bg-background shadow-xs text-center"
										/>
										<InputOTPSlot
											index={5}
											className="w-12 h-12 text-lg rounded-md border border-zinc-300 bg-background shadow-xs text-center"
										/>
									</InputOTPGroup>
								</InputOTP>
							)}
						/>
						<FieldError errors={[form.formState.errors.code]} />
					</div>

					<div className="text-sm text-zinc-600 flex items-center justify-start gap-1">
						<span>Didn&apos;t receive a code?</span>{" "}
						<button
							type="button"
							onClick={handleResendCode}
							disabled={isResending}
							className="text-brand-primary font-medium hover:underline focus:outline-none disabled:opacity-50 disabled:no-underline"
						>
							{isResending ? "Resending..." : "Resend code"}
						</button>
					</div>

					<div className="flex gap-3 items-center justify-end w-full mt-7">
						<Link
							to="/forgot-password"
							className="flex h-9 items-center justify-center rounded-lg border border-brand-primary !text-brand-primary text-sm font-medium px-4 hover:bg-zinc-50 transition-colors w-[126px]"
						>
							<ArrowLeft className="mr-2 size-4" />
							Back
						</Link>
						<RHFSubmitButton
							label="Submit code"
							isSubmitting={form.formState.isSubmitting}
							className="h-9 rounded-lg bg-brand-primary text-sm font-medium text-primary-foreground hover:bg-brand-primary-hover w-[126px]"
						/>
					</div>
				</form>
			</AuthPageLayout>
		</main>
	);
}
