import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	bulkApproveUsersFn,
	getAdminUsersFn,
	getRolesFn,
} from "@/lib/admin.functions";

interface BulkApproveDialogProps {
	children: React.ReactNode;
}

type State = {
	open: boolean;
	page: number;
	search: string;
	selectedUsers: Set<string>;
	userRoles: Record<string, string>;
};

type Action =
	| { type: "SET_OPEN"; payload: boolean }
	| { type: "SET_PAGE"; payload: number }
	| { type: "SET_SEARCH"; payload: string }
	| { type: "TOGGLE_USER"; payload: { userId: string; checked: boolean } }
	| { type: "SELECT_ALL"; payload: { userIds: string[]; checked: boolean } }
	| { type: "SET_USER_ROLE"; payload: { userId: string; roleName: string } }
	| { type: "RESET" };

const initialState: State = {
	open: false,
	page: 1,
	search: "",
	selectedUsers: new Set(),
	userRoles: {},
};

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "SET_OPEN":
			return { ...state, open: action.payload };
		case "SET_PAGE":
			return { ...state, page: action.payload };
		case "SET_SEARCH":
			return { ...state, search: action.payload, page: 1 };
		case "TOGGLE_USER": {
			const newSelected = new Set(state.selectedUsers);
			if (action.payload.checked) {
				newSelected.add(action.payload.userId);
			} else {
				newSelected.delete(action.payload.userId);
			}
			return { ...state, selectedUsers: newSelected };
		}
		case "SELECT_ALL": {
			const newSelected = new Set(state.selectedUsers);
			if (action.payload.checked) {
				for (const id of action.payload.userIds) {
					newSelected.add(id);
				}
			} else {
				for (const id of action.payload.userIds) {
					newSelected.delete(id);
				}
			}
			return { ...state, selectedUsers: newSelected };
		}
		case "SET_USER_ROLE":
			return {
				...state,
				userRoles: {
					...state.userRoles,
					[action.payload.userId]: action.payload.roleName,
				},
			};
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export function BulkApproveDialog({ children }: BulkApproveDialogProps) {
	const [state, dispatch] = React.useReducer(reducer, initialState);
	const { open, page, search, selectedUsers, userRoles } = state;

	const queryClient = useQueryClient();
	const getAdminUsers = useServerFn(getAdminUsersFn);
	const getRoles = useServerFn(getRolesFn);
	const bulkApproveUsers = useServerFn(bulkApproveUsersFn);

	// ── Queries ──────────────────────────────────────────────

	const rolesQuery = useQuery({
		queryKey: ["admin", "roles"],
		queryFn: () => getRoles(),
		enabled: open,
	});

	const usersQuery = useQuery({
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
			dispatch({ type: "RESET" });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	// ── Handlers ─────────────────────────────────────────────

	const handleOpenChange = (newOpen: boolean) => {
		dispatch({ type: "SET_OPEN", payload: newOpen });
		if (!newOpen) {
			// Reset state on close
			setTimeout(() => {
				dispatch({ type: "RESET" });
			}, 200);
		}
	};

	const handleSelectAll = (checked: boolean) => {
		if (!usersQuery.data) return;
		dispatch({
			type: "SELECT_ALL",
			payload: {
				userIds: usersQuery.data.users.map((u) => u.userId),
				checked,
			},
		});
	};

	const handleSelectRow = (userId: string, checked: boolean) => {
		dispatch({ type: "TOGGLE_USER", payload: { userId, checked } });
	};

	const handleRoleChange = (userId: string, roleName: string) => {
		dispatch({ type: "SET_USER_ROLE", payload: { userId, roleName } });
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

	const allVisibleUsersSelected =
		!!usersQuery.data?.users.length &&
		usersQuery.data.users.every((u) => selectedUsers.has(u.userId));

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					React.isValidElement(children) ? children : <span>{children}</span>
				}
			/>
			<DialogContent
				showCloseButton={false}
				className="left-1/2 top-1/2 h-[540px] max-h-[calc(100vh-2rem)] w-[95vw] max-w-[1000px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-white p-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] ring-0 sm:max-w-[1000px]"
			>
				<div className="flex h-full flex-col gap-6 p-6">
					<DialogHeader className="flex flex-row items-center justify-between gap-4">
						<DialogTitle className="text-[20px] font-semibold leading-5 text-[#0a0a0a]">
							Bulk Approve
						</DialogTitle>
						<DialogClose
							render={
								<button
									type="button"
									className="inline-flex h-4 w-4 items-center justify-center text-[#737373] transition-opacity hover:opacity-80"
								/>
							}
						>
							<XIcon className="size-4" />
							<span className="sr-only">Close</span>
						</DialogClose>
					</DialogHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-4">
						<div className="relative w-full max-w-[360px] shrink-0">
							<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search users"
								className="h-8 w-full rounded-md border-[#e5e5e5] bg-white pl-10 text-sm shadow-[0px_1px_1px_rgba(0,0,0,0.1)]"
								value={search}
								onChange={(e) => {
									dispatch({ type: "SET_SEARCH", payload: e.target.value });
								}}
							/>
						</div>

						<div className="relative flex-1 overflow-hidden rounded-md border border-[#e5e5e5] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
							{usersQuery.isFetching && (
								<div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
									<Loader2 className="size-8 animate-spin text-primary" />
								</div>
							)}
							<div className="h-full overflow-auto">
								<Table>
									<TableHeader className="sticky top-0 z-20 bg-white">
										<TableRow className="border-b-[#e5e5e5] hover:bg-transparent">
											<TableHead className="w-[50px] px-4 text-center">
												<Checkbox
													checked={allVisibleUsersSelected}
													onCheckedChange={handleSelectAll}
													aria-label="Select all"
												/>
											</TableHead>
											<TableHead className="min-w-[250px] font-medium text-[#0a0a0a]">
												Name
											</TableHead>
											<TableHead className="min-w-[200px] text-center font-medium text-[#0a0a0a]">
												Department
											</TableHead>
											<TableHead className="w-[200px] pr-6 text-right font-medium text-[#0a0a0a]">
												Assign role
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{usersQuery.data?.users.map((user) => (
											<TableRow
												key={user.userId}
												className="border-b-[#e5e5e5] transition-colors hover:bg-[#fcfcfc]"
											>
												<TableCell className="px-4 text-center">
													<Checkbox
														checked={selectedUsers.has(user.userId)}
														onCheckedChange={(checked) =>
															handleSelectRow(user.userId, checked as boolean)
														}
														aria-label={`Select ${user.firstName}`}
													/>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-[10px]">
														<Avatar className="size-9 border border-[#e5e5e5]">
															<AvatarImage src="" />
															<AvatarFallback className="bg-primary/5 text-xs font-medium text-primary">
																{user.firstName[0]}
																{user.lastName[0]}
															</AvatarFallback>
														</Avatar>
														<div className="flex min-w-0 flex-col">
															<span className="truncate text-[14px] font-medium leading-5 text-[#0a0a0a]">
																{user.firstName}{" "}
																{user.middleName
																	? `${user.middleName[0]}. `
																	: ""}{" "}
																{user.lastName}
															</span>
															<span className="truncate text-[12px] leading-4 text-[#666]">
																{user.campusName}
															</span>
														</div>
													</div>
												</TableCell>
												<TableCell className="text-center text-[14px] text-[#0a0a0a]">
													{user.departmentName ?? "-"}
												</TableCell>
												<TableCell className="pr-6">
													<div className="flex justify-end">
														<Select
															value={userRoles[user.userId]}
															onValueChange={(val) =>
																handleRoleChange(user.userId, val as string)
															}
														>
															<SelectTrigger className="h-[30px] w-[160px] rounded-md border-[#e5e5e5] bg-white px-3 shadow-[0px_1px_1px_rgba(0,0,0,0.1)]">
																<SelectValue placeholder="Select role" />
															</SelectTrigger>
															<SelectContent className="rounded-md shadow-lg">
																{rolesQuery.data?.map((role) => (
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
												</TableCell>
											</TableRow>
										))}
										{!usersQuery.isFetching &&
											usersQuery.data?.users.length === 0 && (
												<TableRow>
													<TableCell
														colSpan={4}
														className="h-32 text-center italic text-muted-foreground"
													>
														No pending users found.
													</TableCell>
												</TableRow>
											)}
									</TableBody>
								</Table>
							</div>
						</div>

						<div className="flex items-center justify-between pt-2">
							<p className="text-[12px] font-medium leading-4 text-[#666]">
								<span className="font-semibold text-[#0a0a0a]">
									{selectedUsers.size}
								</span>{" "}
								of{" "}
								<span className="font-semibold text-[#0a0a0a]">
									{usersQuery.data?.total ?? 0}
								</span>{" "}
								row(s) selected.
							</p>
							<div className="flex items-center gap-1">
								<Button
									variant="outline"
									size="sm"
									className="h-9 rounded-[10px] border-[#e5e5e5] bg-white px-4 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)] hover:bg-white"
									onClick={() =>
										dispatch({
											type: "SET_PAGE",
											payload: Math.max(1, page - 1),
										})
									}
									disabled={page <= 1 || usersQuery.isFetching}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="h-9 rounded-[10px] border-[#e5e5e5] bg-white px-4 text-[14px] font-medium text-[#0a0a0a] shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)] hover:bg-white"
									onClick={() =>
										dispatch({ type: "SET_PAGE", payload: page + 1 })
									}
									disabled={
										!usersQuery.data ||
										page * 5 >= usersQuery.data.total ||
										usersQuery.isFetching
									}
								>
									Next
								</Button>
							</div>
						</div>
					</div>

					<div className="flex justify-end">
						<Button
							onClick={handleApprove}
							disabled={selectedUsers.size === 0 || approveMutation.isPending}
							className="h-9 rounded-[10px] bg-[#1e3b8a] px-[10px] text-[14px] font-medium shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-all hover:bg-[#1e3b8a]/90 active:scale-[0.98]"
						>
							{approveMutation.isPending ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Approving…
								</>
							) : (
								"Approve"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
