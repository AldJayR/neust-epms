import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
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
import { getCampusesFn, getDepartmentsFn } from "@/features/auth";
import { getRolesFn, type UserResponse, updateUserFn } from "./functions";

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

interface LookupItem {
	id: number;
	name: string;
}

interface EditUserFormState {
	firstName: string;
	middleName: string;
	lastName: string;
	nameSuffix: string;
	academicRank: string;
	roleName: string;
	campusId: string;
	departmentId: string;
}

type EditUserFormAction = {
	type: "field";
	field: keyof EditUserFormState;
	value: string;
};

function createEditUserFormState(
	user: UserResponse,
	campuses: LookupItem[],
	departments: LookupItem[],
): EditUserFormState {
	const campus = campuses.find((item) => item.name === user.campusName);
	const department = departments.find(
		(item) => item.name === user.departmentName,
	);

	return {
		firstName: user.firstName,
		middleName: user.middleName ?? "",
		lastName: user.lastName,
		nameSuffix: user.nameSuffix ?? "",
		academicRank: user.academicRank ?? "",
		roleName: user.roleName,
		campusId: campus ? String(campus.id) : "",
		departmentId: department ? String(department.id) : "none",
	};
}

function editUserFormReducer(
	state: EditUserFormState,
	action: EditUserFormAction,
): EditUserFormState {
	return { ...state, [action.field]: action.value };
}

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

	const [formState, dispatch] = React.useReducer(
		editUserFormReducer,
		{
			user,
			campuses:
				queryClient.getQueryData<LookupItem[]>(["campuses"]) ?? campuses,
			departments:
				queryClient.getQueryData<LookupItem[]>(["departments"]) ?? departments,
		},
		({
			user: initialUser,
			campuses: initialCampuses,
			departments: initialDepartments,
		}) =>
			createEditUserFormState(initialUser, initialCampuses, initialDepartments),
	);

	const updateMutation = useMutation({
		mutationFn: () => {
			const selectedRole = roles.find((r) => r.roleName === formState.roleName);
			return updateUserFn({
				data: {
					userId: user.userId,
					firstName: formState.firstName,
					middleName: formState.middleName || null,
					lastName: formState.lastName,
					nameSuffix: formState.nameSuffix || null,
					academicRank: formState.academicRank || null,
					campusId: formState.campusId ? Number(formState.campusId) : undefined,
					departmentId:
						formState.departmentId && formState.departmentId !== "none"
							? Number(formState.departmentId)
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
		if (
			!formState.firstName ||
			!formState.lastName ||
			!formState.academicRank ||
			!formState.campusId
		) {
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
									value={formState.firstName}
									onChange={(e) =>
										dispatch({
											type: "field",
											field: "firstName",
											value: e.target.value,
										})
									}
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
									value={formState.lastName}
									onChange={(e) =>
										dispatch({
											type: "field",
											field: "lastName",
											value: e.target.value,
										})
									}
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
									value={formState.middleName}
									onChange={(e) =>
										dispatch({
											type: "field",
											field: "middleName",
											value: e.target.value,
										})
									}
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
									value={formState.nameSuffix}
									onChange={(e) =>
										dispatch({
											type: "field",
											field: "nameSuffix",
											value: e.target.value,
										})
									}
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
									value={formState.academicRank}
									onValueChange={(val) =>
										dispatch({
											type: "field",
											field: "academicRank",
											value: val ?? "",
										})
									}
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
									value={formState.roleName}
									onValueChange={(val) =>
										dispatch({
											type: "field",
											field: "roleName",
											value: val ?? "",
										})
									}
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
									value={formState.campusId}
									onValueChange={(val) =>
										dispatch({
											type: "field",
											field: "campusId",
											value: val ?? "",
										})
									}
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
									value={formState.departmentId}
									onValueChange={(val) =>
										dispatch({
											type: "field",
											field: "departmentId",
											value: val ?? "",
										})
									}
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
