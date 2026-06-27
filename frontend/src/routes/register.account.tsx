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
import {
	RHFCheckboxField,
	RHFPasswordField,
	RHFSubmitButton,
	RHFTextField,
} from "../components/rhf-auth-fields";
import { AuthPageLayout } from "../components/custom/auth-page-layout";
import { AuthStepIndicator } from "../components/custom/auth-step-indicator";
import { FieldGroup } from "../components/ui/field";
import { checkPasswordFn, signupFn } from "../lib/auth.functions";

const registerStep2Schema = z
	.object({
		email: z.email("Please enter a valid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
		acceptTerms: z.boolean(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})
	.refine((data) => data.acceptTerms === true, {
		message: "You must accept the terms and conditions",
		path: ["acceptTerms"],
	});

export const Route = createFileRoute("/register/account")({
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: "/dashboard", search: { page: 1, pageSize: 10 } });
		}
	},
	component: RegisterStepTwo,
});

function RegisterStepTwo() {
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<string | null>(null);
	const [isRegistered, setIsRegistered] = useState(false);
	const [passwordChecking, setPasswordChecking] = useState(false);

	const form = useForm<z.infer<typeof registerStep2Schema>>({
		resolver: zodResolver(registerStep2Schema),
		mode: "onBlur",
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			acceptTerms: false,
		},
	});

	async function handlePasswordBlur(password: string) {
		if (password.length < 8) return;
		setPasswordChecking(true);
		try {
			const result = await checkPasswordFn({ data: { password } });
			if (result.compromised) {
				form.setError("password", {
					type: "manual",
					message:
						"This password has been exposed in a data breach. Please choose a different one.",
				});
			}
		} catch {
			toast.error("Failed to check password safety.");
		}
		setPasswordChecking(false);
	}

	async function onSubmit(data: z.infer<typeof registerStep2Schema>) {
		setServerError(null);

		// Read step 1 data from sessionStorage
		const step1Raw = sessionStorage.getItem("register_step1:v1");

		if (!step1Raw) {
			setServerError(
				"Missing profile information. Please complete step 1 first.",
			);
			toast.error("Missing profile information", {
				description: "Please go back to step 1.",
			});
			return;
		}

		const step1 = JSON.parse(step1Raw) as {
			firstName: string;
			lastName: string;
			departmentId: string;
			campusId: string;
			academicRank: string;
		};

		// Call the signup server function
		const result = await signupFn({
			data: {
				email: data.email,
				password: data.password,
				firstName: step1.firstName,
				lastName: step1.lastName,
				departmentId: step1.departmentId,
				campusId: step1.campusId,
				academicRank: step1.academicRank,
			},
		});

		if (result.error) {
			setServerError(result.message);
			toast.error("Registration failed", { description: result.message });
			return;
		}

		// Success — clean up sessionStorage
		sessionStorage.removeItem("register_step1:v1");
		setIsRegistered(true);
		toast.success("Account created!", { description: result.message });
	}

	// Show success state after registration
	if (isRegistered) {
		return (
			<section className="w-full rounded-xl p-6 text-center">
				<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100">
					<svg
						className="size-6 text-green-600"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="2"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M4.5 12.75l6 6 9-13.5"
						/>
					</svg>
				</div>
				<h1 className="text-lg font-semibold text-card-foreground">
					Account Created
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Your account has been created successfully. Please wait for an
					administrator to activate your account before logging in.
				</p>
				<Link
					to="/login"
					className="mt-6 inline-block rounded-lg bg-brand-primary px-6 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover"
				>
					Go to Login
				</Link>
			</section>
		);
	}

	return (
		<AuthPageLayout
			title="Create your account"
			description="Set up your login credentials"
			error={serverError}
			footer={
				<>
					Already have an account?{" "}
					<Link
						to="/login"
						className="text-black hover:text-black underline underline-offset-2"
					>
						Log in
					</Link>
				</>
			}
		>
			<div className="flex items-center justify-end gap-2 pt-4">
				<AuthStepIndicator
					steps={2}
					currentStep={1}
					onStepClick={(step) => {
						if (step === 0) navigate({ to: "/register" });
					}}
				/>
			</div>

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
						description={
							passwordChecking
								? "Checking password..."
								: "At least 8 characters"
						}
						onBlur={() => handlePasswordBlur(form.getValues("password"))}
					/>

					<RHFPasswordField
						control={form.control}
						name="confirmPassword"
						label="Confirm Password"
					/>

					<RHFCheckboxField
						control={form.control}
						name="acceptTerms"
						label="I accept the terms and conditions"
					/>
				</FieldGroup>

				<div className="mt-7">
					<RHFSubmitButton
						label="Register"
						isSubmitting={form.formState.isSubmitting}
						className="h-9 w-full rounded-lg bg-brand-primary text-sm font-medium text-primary-foreground hover:bg-brand-primary-hover"
					/>
				</div>
			</form>
		</AuthPageLayout>
	);
}
