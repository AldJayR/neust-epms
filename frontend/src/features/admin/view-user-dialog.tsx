import * as React from "react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import type { UserResponse } from "./functions";
import { formatAcademicRank } from "@/lib/utils";

interface ViewUserDialogProps {
	user: UserResponse;
	children?: React.ReactNode;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function ViewUserDialog({
	user,
	children,
	isOpen: controlledIsOpen,
	onOpenChange: controlledOnOpenChange,
}: ViewUserDialogProps) {
	const [localIsOpen, setLocalIsOpen] = useState(false);
	const isOpen =
		controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
	const setIsOpen =
		controlledOnOpenChange !== undefined
			? controlledOnOpenChange
			: setLocalIsOpen;

	const getFullName = () => {
		const parts = [user.firstName, user.middleName, user.lastName].filter(
			Boolean,
		);
		let name = parts.join(" ");
		if (user.nameSuffix) {
			name += `, ${user.nameSuffix}`;
		}
		return name;
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
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>User Account Details</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-2">
					<div className="flex items-center gap-4 pb-2">
						<Avatar className="h-14 w-14">
							<AvatarImage
								src={user.avatarUrl ?? ""}
								alt={`${user.firstName} ${user.lastName}`}
							/>
							<AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
								{user.firstName?.charAt(0) ?? ""}
								{user.lastName?.charAt(0) ?? ""}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-base font-semibold text-foreground">
								{getFullName()}
							</span>
							<span className="text-xs text-muted-foreground">
								{user.roleName}
							</span>
						</div>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								Email Address
							</span>
							<span className="text-sm font-medium text-foreground break-all">
								{user.email}
							</span>
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								Status
							</span>
							<div>
								<StatusBadge
									status={user.isActive ? "Active" : "Deactivated"}
								/>
							</div>
						</div>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								Academic Rank
							</span>
							<span className="text-sm font-medium text-foreground">
								{formatAcademicRank(user.academicRank)}
							</span>
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								Role
							</span>
							<span className="text-sm font-medium text-foreground">
								{user.roleName}
							</span>
						</div>
					</div>
					<Separator />
					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								Campus
							</span>
							<span className="text-sm font-medium text-foreground">
								{user.campusName}
							</span>
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								Department
							</span>
							<span className="text-sm font-medium text-foreground">
								{user.departmentName ?? "N/A"}
							</span>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => setIsOpen(false)}
						className="border-border text-foreground hover:bg-muted"
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
