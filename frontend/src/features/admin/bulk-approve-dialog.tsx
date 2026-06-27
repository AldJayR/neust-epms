import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandButton } from "@/components/custom/brand-button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	bulkApproveUsersFn,
	getAdminUsersFn,
	getRolesFn,
	type UserResponse,
} from "@/lib/admin.functions";

interface UserApprovalListProps {
	users: UserResponse[];
	selectedUsers: Set<string>;
	allVisibleSelected: boolean;
	onSelectAll: (checked: boolean) => void;
	onSelectRow: (userId: string, checked: boolean) => void;
	userRoles: Record<string, string>;
	onRoleChange: (userId: string, roleName: string) => void;
	roles: { roleId: number; roleName: string }[] | undefined;
	isLoading: boolean;
	showHeader: boolean;
}

function UserApprovalList({
	users,
	selectedUsers,
	allVisibleSelected,
	onSelectAll,
	onSelectRow,
	userRoles,
	onRoleChange,
	roles,
	isLoading,
	showHeader,
}: UserApprovalListProps) {
	const columns: DataTableColumnDef<UserResponse>[] = [
		{
			id: "select",
			header: () => (
				<div className="flex justify-center">
					<Checkbox
						checked={allVisibleSelected}
						onCheckedChange={onSelectAll}
						aria-label="Select all"
					/>
				</div>
			),
			headerClassName: "w-[50px] px-4 text-center",
			cellClassName: "px-4 text-center",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<Checkbox
						checked={selectedUsers.has(row.original.userId)}
						onCheckedChange={(checked) =>
							onSelectRow(row.original.userId, checked as boolean)
						}
						aria-label={`Select ${row.original.firstName}`}
					/>
				</div>
			),
		},
		{
			id: "name",
			header: "Name",
			headerClassName: "min-w-[250px] font-medium text-foreground text-left",
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex items-center gap-[10px]">
						<Avatar className="size-9 border border-border">
							<AvatarImage src="" alt={`${user.firstName} ${user.lastName}`} />
							<AvatarFallback className="bg-primary/5 text-xs font-medium text-primary">
								{user.firstName?.charAt(0) ?? ""}
								{user.lastName?.charAt(0) ?? ""}
							</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-col text-left">
							<span className="truncate text-sm font-medium leading-5 text-foreground">
								{user.firstName}{" "}
								{user.middleName ? `${user.middleName.charAt(0)}. ` : ""}{" "}
								{user.lastName}
							</span>
							<span className="truncate text-xs leading-4 text-muted-foreground">
								{user.campusName}
							</span>
						</div>
					</div>
				);
			},
		},
		{
			id: "department",
			header: () => <div className="text-center">Department</div>,
			headerClassName: "min-w-[200px] text-center font-medium text-foreground",
			cellClassName: "text-center text-sm text-foreground",
			cell: ({ row }) => row.original.departmentName ?? "-",
		},
		{
			id: "role",
			header: () => <div className="text-right">Assign role</div>,
			headerClassName: "w-[200px] pr-6 text-right font-medium text-foreground",
			cellClassName: "pr-6",
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex justify-end">
						<Select
							value={userRoles[user.userId]}
							onValueChange={(val) => onRoleChange(user.userId, val as string)}
						>
							<SelectTrigger className="h-[30px] w-[160px] rounded-md border-border bg-background px-3 shadow-[0px_1px_1px_var(--shadow-card)]">
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent className="rounded-md shadow-lg">
								{roles?.map((role) => (
									<SelectItem
										key={role.roleId}
										value={role.roleName}
										className="text-sm"
									>
										{role.roleName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				);
			},
		},
	];

	return (
		<div className="relative flex-1 overflow-hidden rounded-md border border-border bg-background shadow-[0px_1px_3px_0px_var(--shadow-card)]">
			{isLoading && (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
					<Loader2 className="size-8 animate-spin text-primary" />
				</div>
			)}
			<div className="h-full overflow-auto">
				<DataTable
					columns={columns}
					data={users}
					emptyMessage="No pending users found."
					ariaLabel="Pending users for approval"
					showHeader={showHeader}
				/>
			</div>
		</div>
	);
}

interface BulkApproveDialogProps {
	children: React.ReactNode;
}

interface State {
	open: boolean;
	page: number;
	search: string;
	selectedUsers: Set<string>;
	userRoles: Record<string, string>;
}

const initialState: State = {
	open: false,
	page: 1,
	search: "",
	selectedUsers: new Set(),
	userRoles: {},
};

function stateReducer(
	state: State,
	action: Partial<State> | ((prev: State) => Partial<State>),
): State {
	const next = typeof action === "function" ? action(state) : action;
	return { ...state, ...next };
}

export function BulkApproveDialog({ children }: BulkApproveDialogProps) {
	const [state, dispatch] = React.useReducer(stateReducer, initialState);
	const { open, page, search, selectedUsers, userRoles } = state;

	const queryClient = useQueryClient();
	const getAdminUsers = useServerFn(getAdminUsersFn);
	const getRoles = useServerFn(getRolesFn);
	const bulkApproveUsers = useServerFn(bulkApproveUsersFn);

	// ── Queries ──────────────────────────────────────────────

	const { data: rolesData } = useQuery({
		queryKey: ["admin", "roles"],
		queryFn: () => getRoles(),
		enabled: open,
	});

	const { data: usersData, isFetching: isUsersFetching } = useQuery({
		queryKey: ["admin", "users", "pending", { page, search }],
		queryFn: () =>
			getAdminUsers({
				data: { page, pageSize: 5, search, isActive: "false" },
			}),
		enabled: open,
	});

	// ── Mutations ────────────────────────────────────────────

	const approveMutation = useMutation({
		mutationFn: (data: { users: { userId: string; roleName: string }[] }) =>
			bulkApproveUsers({ data }),
		onSuccess: (data) => {
			toast.success(`Successfully approved ${data.updatedCount} user(s)`);
			queryClient.invalidateQueries({ queryKey: ["admin"] });
			dispatch({
				open: false,
				page: 1,
				search: "",
				selectedUsers: new Set(),
				userRoles: {},
			});
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	// ── Handlers ─────────────────────────────────────────────

	const handleOpenChange = (newOpen: boolean) => {
		dispatch({ open: newOpen });
		if (!newOpen) {
			setTimeout(() => {
				dispatch({
					page: 1,
					search: "",
					selectedUsers: new Set(),
					userRoles: {},
				});
			}, 200);
		}
	};

	const handleSelectAll = (checked: boolean) => {
		if (!usersData) return;
		dispatch((prev) => {
			const next = new Set(prev.selectedUsers);
			for (const id of usersData.users.map((u) => u.userId)) {
				if (checked) next.add(id);
				else next.delete(id);
			}
			return { selectedUsers: next };
		});
	};

	const handleSelectRow = (userId: string, checked: boolean) => {
		dispatch((prev) => {
			const next = new Set(prev.selectedUsers);
			if (checked) next.add(userId);
			else next.delete(userId);
			return { selectedUsers: next };
		});
	};

	const handleRoleChange = (userId: string, roleName: string) => {
		dispatch((prev) => ({
			userRoles: { ...prev.userRoles, [userId]: roleName },
		}));
	};

	const handleApprove = () => {
		if (selectedUsers.size === 0) return;

		const usersToApprove: { userId: string; roleName: string }[] = [];

		// Convert Set to Array and map to required format
		let validationFailed = false;
		for (const userId of selectedUsers) {
			const assignedRole = userRoles[userId];
			if (!assignedRole) {
				validationFailed = true;
				break;
			}
			usersToApprove.push({ userId, roleName: assignedRole });
		}

		if (validationFailed) {
			toast.error("Please assign a role to all selected users.");
			return;
		}

		approveMutation.mutate({ users: usersToApprove });
	};

	const users = usersData?.users ?? [];
	const showTableHeader = users.length > 0 || (search ?? "").trim().length > 0;

	const allVisibleUsersSelected =
		users.length > 0 && users.every((u) => selectedUsers.has(u.userId));

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					React.isValidElement(children) ? children : <span>{children}</span>
				}
			/>
			<DialogContent
				showCloseButton={false}
				className="left-1/2 top-1/2 h-[540px] max-h-[calc(100vh-2rem)] w-[95vw] max-w-[1000px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] border border-border bg-background p-0 shadow-[0px_10px_15px_-3px_var(--shadow-card),0px_4px_6px_-4px_var(--shadow-card)] ring-0 sm:max-w-[1000px]"
			>
				<div className="flex h-full flex-col gap-6 p-6">
					<DialogHeader className="flex flex-row items-center justify-between gap-4">
						<DialogTitle className="text-[20px] font-semibold leading-5 text-foreground">
							Bulk Approve
						</DialogTitle>
						<DialogClose
							render={
								<button
									type="button"
									aria-label="Close"
									className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								/>
							}
						>
							<XIcon className="size-4" />
							<span className="sr-only">Close</span>
						</DialogClose>
					</DialogHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-4">
						<SearchInput
							value={search}
							onChange={(val) => {
								dispatch({ search: val, page: 1 });
							}}
							placeholder="Search users"
							ariaLabel="Search pending users"
							className="max-w-[360px]"
						/>

						<UserApprovalList
							users={users}
							selectedUsers={selectedUsers}
							allVisibleSelected={allVisibleUsersSelected}
							onSelectAll={handleSelectAll}
							onSelectRow={handleSelectRow}
							userRoles={userRoles}
							onRoleChange={handleRoleChange}
							roles={rolesData}
							isLoading={isUsersFetching}
							showHeader={showTableHeader}
						/>

						<PaginationBar
							page={page}
							totalPages={Math.ceil((usersData?.total ?? 0) / 5)}
							onPageChange={(p) => dispatch({ page: p })}
							total={usersData?.total ?? 0}
							limit={5}
							isLoading={isUsersFetching}
						/>
					</div>

					<div className="flex justify-end">
						<BrandButton
							onClick={handleApprove}
							disabled={selectedUsers.size === 0 || approveMutation.isPending}
							className="h-9 px-[10px] text-sm font-medium shadow-[0px_1px_2px_0px_var(--shadow-card)] transition-all hover:bg-brand-primary-hover active:scale-[0.98]"
						>
							{approveMutation.isPending ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Approving…
								</>
							) : (
								"Approve"
							)}
						</BrandButton>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
