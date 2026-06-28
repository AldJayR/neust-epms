import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { AnimatePresence, domMax, LazyMotion, m } from "motion/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthPageLayout } from "../components/custom/auth-page-layout";
import { AuthStepIndicator } from "../components/custom/auth-step-indicator";
import {
	RHFSelectField,
	RHFSubmitButton,
	RHFTextField,
} from "../components/rhf-auth-fields";
import { FieldGroup } from "../components/ui/field";
import { getCampusesFn, getDepartmentsFn } from "../lib/auth.functions";

const registerStep1Schema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	departmentId: z.string().min(1, "Please select a department"),
	campusId: z.string().min(1, "Please select a campus"),
	academicRank: z.string().min(1, "Please select your academic rank"),
});

const rankOptions = [
	{ label: "Instructor I", value: "instructor-1" },
	{ label: "Instructor II", value: "instructor-2" },
	{ label: "Instructor III", value: "instructor-3" },
	{ label: "Assistant Professor I", value: "assistant-prof-1" },
	{ label: "Assistant Professor II", value: "assistant-prof-2" },
	{ label: "Associate Professor I", value: "associate-prof-1" },
	{ label: "Associate Professor II", value: "associate-prof-2" },
	{ label: "Professor I", value: "professor-1" },
];

export const Route = createFileRoute("/register")({
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: "/dashboard", search: { page: 1, pageSize: 10 } });
		}
	},
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData({
				queryKey: ["departments"],
				queryFn: () => getDepartmentsFn(),
				staleTime: Number.POSITIVE_INFINITY,
			}),
			context.queryClient.ensureQueryData({
				queryKey: ["campuses"],
				queryFn: () => getCampusesFn(),
				staleTime: Number.POSITIVE_INFINITY,
			}),
		]);
	},
	pendingComponent: () => null,
	component: RegisterRoute,
});

function RegisterRoute() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8 w-full">
			<LazyMotion features={domMax}>
				<AnimatePresence mode="wait" initial={false}>
					<m.div
						key={pathname}
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="w-full flex justify-center"
					>
						{pathname !== "/register" ? <Outlet /> : <RegisterStepOneForm />}
					</m.div>
				</AnimatePresence>
			</LazyMotion>
		</main>
	);
}

function RegisterStepOneForm() {
	const navigate = useNavigate();

	const { data: departments = [], isLoading: loadingDepartments } = useQuery({
		queryKey: ["departments"],
		queryFn: () => getDepartmentsFn(),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const { data: campuses = [], isLoading: loadingCampuses } = useQuery({
		queryKey: ["campuses"],
		queryFn: () => getCampusesFn(),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const departmentOptions = departments.map((d) => ({
		label: d.name,
		value: String(d.id),
	}));

	const campusOptions = campuses.map((c) => ({
		label: c.name,
		value: String(c.id),
	}));

	const form = useForm<z.infer<typeof registerStep1Schema>>({
		resolver: zodResolver(registerStep1Schema),
		mode: "onBlur",
		defaultValues: (() => {
			const saved = sessionStorage.getItem("register_step1:v1");
			if (saved) {
				try {
					return JSON.parse(saved);
				} catch {
					toast.error("Failed to restore registration data.");
				}
			}
			return {
				firstName: "",
				lastName: "",
				departmentId: "",
				campusId: "",
				academicRank: "",
			};
		})(),
	});

	function onSubmit(data: z.infer<typeof registerStep1Schema>) {
		// Store step 1 data for step 2 to read on final submit
		sessionStorage.setItem("register_step1:v1", JSON.stringify(data));
		navigate({ to: "/register/account" });
	}

	return (
		<AuthPageLayout
			title="Create your account"
			description="Fill in your faculty profile details"
			headerAction={<AuthStepIndicator steps={2} currentStep={0} />}
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
			<form
				className="mt-6"
				method="POST"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<FieldGroup>
					<div className="grid gap-7 sm:grid-cols-2">
						<RHFTextField
							control={form.control}
							name="firstName"
							label="First Name"
						/>
						<RHFTextField
							control={form.control}
							name="lastName"
							label="Last Name"
						/>
					</div>

					<div className="grid gap-7 sm:grid-cols-2">
						<RHFSelectField
							control={form.control}
							name="departmentId"
							label="Department"
							placeholder={
								loadingDepartments
									? "Loading departments..."
									: "Select department"
							}
							options={departmentOptions}
						/>
						<RHFSelectField
							control={form.control}
							name="campusId"
							label="Campus"
							placeholder={
								loadingCampuses ? "Loading campuses..." : "Select campus"
							}
							options={campusOptions}
						/>
					</div>

					<RHFSelectField
						control={form.control}
						name="academicRank"
						label="Academic Rank"
						placeholder="Select rank"
						options={rankOptions}
					/>
				</FieldGroup>

				<div className="mt-7">
					<RHFSubmitButton
						label="Next"
						isSubmitting={form.formState.isSubmitting}
						className="h-9 w-full rounded-lg bg-brand-primary text-sm font-medium text-primary-foreground hover:bg-brand-primary-hover"
					/>
				</div>
			</form>
		</AuthPageLayout>
	);
}
