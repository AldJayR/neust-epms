import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getRolesFn,
	type UserResponse,
	updateUserFn,
} from "@/lib/admin.functions";
import { getCampusesFn, getDepartmentsFn } from "@/lib/auth.functions";

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

interface EditUserDialogProps {
	user: UserResponse;
	children?: React.ReactNode;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditUserDialog({
	user,
	children,
	isOpen: controlledIsOpen,
	onOpenChange: controlledOnOpenChange,
}: EditUserDialogProps) {
	const queryClient = useQueryClient();
	const [localIsOpen, setLocalIsOpen] = useState(false);
	const isOpen =
		controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
	const setIsOpen =
		controlledOnOpenChange !== undefined
			? controlledOnOpenChange
			: setLocalIsOpen;
	const [firstName, setFirstName] = useState(user.firstName);
	const [middleName, setMiddleName] = useState(user.middleName ?? "");
	const [lastName, setLastName] = useState(user.lastName);
	const [nameSuffix, setNameSuffix] = useState(user.nameSuffix ?? "");
	const [academicRank, setAcademicRank] = useState(user.academicRank ?? "");
	const [campusId, setCampusId] = useState<string>("");
	const [departmentId, setDepartmentId] = useState<string>("");
	const [roleName, setRoleName] = useState(user.roleName);

	const { data: departments = [] } = useQuery({
		queryKey: ["departments"],
		queryFn: () => getDepartmentsFn(),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const { data: campuses = [] } = useQuery({
		queryKey: ["campuses"],
		queryFn: () => getCampusesFn(),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const { data: roles = [] } = useQuery({
		queryKey: ["roles"],
		queryFn: () => getRolesFn(),
		staleTime: Number.POSITIVE_INFINITY,
	});

	useEffect(() => {
		if (isOpen) {
			setFirstName(user.firstName);
			setMiddleName(user.middleName ?? "");
			setLastName(user.lastName);
			setNameSuffix(user.nameSuffix ?? "");
			setAcademicRank(user.academicRank ?? "");
			setRoleName(user.roleName);

			const matchCampus = campuses.find((c) => c.name === user.campusName);
			if (matchCampus) {
				setCampusId(String(matchCampus.id));
			}

			const matchDept = departments.find((d) => d.name === user.departmentName);
			if (matchDept) {
				setDepartmentId(String(matchDept.id));
			} else {
				setDepartmentId("none");
			}
		}
	}, [isOpen, user, campuses, departments]);

	const updateMutation = useMutation({
		mutationFn: () => {
			const selectedRole = roles.find((r) => r.roleName === roleName);
			return updateUserFn({
				data: {
					userId: user.userId,
					firstName,
					middleName: middleName || null,
					lastName,
					nameSuffix: nameSuffix || null,
					academicRank: academicRank || null,
					campusId: campusId ? Number(campusId) : undefined,
					departmentId:
						departmentId && departmentId !== "none"
							? Number(departmentId)
							: null,
					roleId: selectedRole?.roleId,
				},
			});
		},
		onSuccess: () => {
			toast.success("User updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["admin"] });
			setIsOpen(false);
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!firstName || !lastName || !academicRank || !campusId) {
			toast.error("Please fill in all required fields.");
			return;
		}
		updateMutation.mutate();
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			{children && (
				<DialogTrigger
					render={
						React.isValidElement(children) ? children : <span>{children}</span>
					}
				/>
			)}
			<DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh] p-6">
				<DialogHeader className="shrink-0">
					<DialogTitle>Edit User Profile</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={handleSubmit}
					className="flex-1 flex flex-col gap-5 min-h-0"
				>
					<div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-5 py-1">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-firstName" className="text-sm font-medium">
									First Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="edit-firstName"
									placeholder="First name"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									required
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-lastName" className="text-sm font-medium">
									Last Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="edit-lastName"
									placeholder="Last name"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									required
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1.5">
								<Label
									htmlFor="edit-middleName"
									className="text-sm font-medium"
								>
									Middle Name (Optional)
								</Label>
								<Input
									id="edit-middleName"
									placeholder="Middle name"
									value={middleName}
									onChange={(e) => setMiddleName(e.target.value)}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label
									htmlFor="edit-nameSuffix"
									className="text-sm font-medium"
								>
									Extension (Optional)
								</Label>
								<Input
									id="edit-nameSuffix"
									placeholder="e.g. Jr., III"
									value={nameSuffix}
									onChange={(e) => setNameSuffix(e.target.value)}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-sm font-medium">
								Email Address (Locked)
							</Label>
							<Input
								value={user.email}
								disabled
								className="bg-muted text-muted-foreground border-border"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1.5">
								<Label
									htmlFor="edit-academicRank"
									className="text-sm font-medium"
								>
									Academic Rank <span className="text-destructive">*</span>
								</Label>
								<Select
									value={academicRank}
									onValueChange={(val) => setAcademicRank(val ?? "")}
								>
									<SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-left">
										<SelectValue placeholder="Select rank">
											{(val) =>
												rankOptions.find((o) => o.value === val)?.label ?? val
											}
										</SelectValue>
									</SelectTrigger>
									<SelectContent className="z-50">
										{rankOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-role" className="text-sm font-medium">
									Role <span className="text-destructive">*</span>
								</Label>
								<Select
									value={roleName}
									onValueChange={(val) => setRoleName(val ?? "")}
								>
									<SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-left">
										<SelectValue placeholder="Select role">
											{(val) => val}
										</SelectValue>
									</SelectTrigger>
									<SelectContent className="z-50">
										{roles.map((r) => (
											<SelectItem key={r.roleId} value={r.roleName}>
												{r.roleName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-campus" className="text-sm font-medium">
									Campus <span className="text-destructive">*</span>
								</Label>
								<Select
									value={campusId}
									onValueChange={(val) => setCampusId(val ?? "")}
								>
									<SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-left">
										<SelectValue placeholder="Select campus">
											{(val) =>
												campuses.find((c) => String(c.id) === val)?.name ?? val
											}
										</SelectValue>
									</SelectTrigger>
									<SelectContent className="z-50">
										{campuses.map((c) => (
											<SelectItem key={c.id} value={String(c.id)}>
												{c.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label
									htmlFor="edit-department"
									className="text-sm font-medium"
								>
									Department (Optional)
								</Label>
								<Select
									value={departmentId}
									onValueChange={(val) => setDepartmentId(val ?? "")}
								>
									<SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-left">
										<SelectValue placeholder="Select department">
											{(val) => {
												if (val === "none") return "None";
												return (
													departments.find((d) => String(d.id) === val)?.name ??
													val
												);
											}}
										</SelectValue>
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
							</div>
						</div>
					</div>

					<DialogFooter className="flex gap-3 pt-2 shrink-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsOpen(false)}
							disabled={updateMutation.isPending}
							className="border-border text-foreground hover:bg-muted"
						>
							Cancel
						</Button>
						<BrandButton type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && (
								<Loader2 className="size-4 animate-spin mr-1.5" />
							)}
							Save changes
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
