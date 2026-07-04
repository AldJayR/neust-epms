import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/custom/brand-button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getDepartmentsFn } from "@/lib/auth.functions";
import { provisionDirectorFn } from "@/lib/admin.functions";

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

export function AddUserDialog({ children }: { children?: React.ReactNode }) {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);
	const [firstName, setFirstName] = useState("");
	const [middleName, setMiddleName] = useState("");
	const [lastName, setLastName] = useState("");
	const [nameSuffix, setNameSuffix] = useState("");
	const [email, setEmail] = useState("");
	const [academicRank, setAcademicRank] = useState("");
	const [departmentId, setDepartmentId] = useState<string>("");

	const { data: departments = [] } = useQuery({
		queryKey: ["departments"],
		queryFn: () => getDepartmentsFn(),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const provisionMutation = useMutation({
		mutationFn: () =>
			provisionDirectorFn({
				data: {
					firstName,
					middleName: middleName || null,
					lastName,
					nameSuffix: nameSuffix || null,
					email,
					academicRank,
					departmentId:
						departmentId && departmentId !== "none"
							? Number(departmentId)
							: null,
				},
			}),
		onSuccess: (data) => {
			toast.success(
				`Successfully provisioned Director account for ${email}! Temporary Password: ${data.temporaryPassword}`,
				{ duration: 15000 },
			);
			queryClient.invalidateQueries({ queryKey: ["admin"] });
			setIsOpen(false);
			resetForm();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const resetForm = () => {
		setFirstName("");
		setMiddleName("");
		setLastName("");
		setNameSuffix("");
		setEmail("");
		setAcademicRank("");
		setDepartmentId("");
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!firstName || !lastName || !email || !academicRank) {
			toast.error("Please fill in all required fields.");
			return;
		}
		provisionMutation.mutate();
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(val) => {
				setIsOpen(val);
				if (!val) resetForm();
			}}
		>
			<DialogTrigger
				render={
					React.isValidElement(children) ? children : <span>{children}</span>
				}
			/>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Add User (Director)</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
					<div className="grid grid-cols-2 gap-4">
						<FieldGroup>
							<Label htmlFor="firstName" className="text-sm font-medium">
								First Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="firstName"
								placeholder="First name"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								required
							/>
						</FieldGroup>
						<FieldGroup>
							<Label htmlFor="lastName" className="text-sm font-medium">
								Last Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="lastName"
								placeholder="Last name"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								required
							/>
						</FieldGroup>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<FieldGroup>
							<Label htmlFor="middleName" className="text-sm font-medium">
								Middle Name (Optional)
							</Label>
							<Input
								id="middleName"
								placeholder="Middle name"
								value={middleName}
								onChange={(e) => setMiddleName(e.target.value)}
							/>
						</FieldGroup>
						<FieldGroup>
							<Label htmlFor="nameSuffix" className="text-sm font-medium">
								Extension (Optional)
							</Label>
							<Input
								id="nameSuffix"
								placeholder="e.g. Jr., III"
								value={nameSuffix}
								onChange={(e) => setNameSuffix(e.target.value)}
							/>
						</FieldGroup>
					</div>

					<FieldGroup>
						<Label htmlFor="email" className="text-sm font-medium">
							Email Address <span className="text-destructive">*</span>
						</Label>
						<Input
							id="email"
							type="email"
							placeholder="email@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</FieldGroup>

					<div className="grid grid-cols-2 gap-4">
						<FieldGroup>
							<Label htmlFor="academicRank" className="text-sm font-medium">
								Academic Rank <span className="text-destructive">*</span>
							</Label>
							<Select value={academicRank} onValueChange={(val) => setAcademicRank(val ?? "")}>
								<SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-left">
									<SelectValue placeholder="Select rank" />
								</SelectTrigger>
								<SelectContent className="z-50">
									{rankOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FieldGroup>

						<FieldGroup>
							<Label htmlFor="department" className="text-sm font-medium">
								Department (Optional)
							</Label>
							<Select value={departmentId} onValueChange={(val) => setDepartmentId(val ?? "")}>
								<SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-left">
									<SelectValue placeholder="Select department" />
								</SelectTrigger>
								<SelectContent className="z-50">
									<SelectItem value="none">None</SelectItem>
									{departments.map((d) => (
										<SelectItem key={d.id} value={String(d.id)}>
											{d.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FieldGroup>
					</div>

					<FieldGroup>
						<Label htmlFor="role" className="text-sm font-medium">
							System Role (Locked)
						</Label>
						<Input
							id="role"
							value="Director"
							disabled
							className="bg-muted text-muted-foreground border-border"
						/>
					</FieldGroup>

					<Alert className="bg-amber-50/50 border-amber-200/60 text-amber-800 flex items-start gap-2.5 p-3 rounded-lg">
						<AlertCircle className="size-4 mt-0.5 shrink-0 text-amber-600" />
						<AlertDescription className="text-amber-700 text-xs font-normal leading-relaxed">
							A temporary password will be generated and sent to the email address. The user will be prompted to change it on first login.
						</AlertDescription>
					</Alert>

					<DialogFooter className="flex gap-3 pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsOpen(false)}
							disabled={provisionMutation.isPending}
							className="border-border text-foreground hover:bg-muted"
						>
							Cancel
						</Button>
						<BrandButton
							type="submit"
							disabled={provisionMutation.isPending}
							className="flex items-center gap-1.5"
						>
							{provisionMutation.isPending && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Provision account
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
