import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateResetLinkFn, type UserResponse } from "./functions";

interface GenerateResetLinkDialogProps {
	user: UserResponse;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

function formatExpiry(expiresAt: string): string {
	return new Date(expiresAt).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

export function GenerateResetLinkDialog({
	user,
	isOpen,
	onOpenChange,
}: GenerateResetLinkDialogProps) {
	const [resetUrl, setResetUrl] = useState<string | null>(null);
	const [expiresAt, setExpiresAt] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const generatedForOpen = useRef(false);

	const generateMutation = useMutation({
		mutationFn: () => generateResetLinkFn({ data: { userId: user.userId } }),
		onSuccess: (data) => {
			setResetUrl(
				`${window.location.origin}/reset-password?token=${data.token}`,
			);
			setExpiresAt(data.expiresAt);
			setCopied(false);
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	useEffect(() => {
		if (isOpen && !generatedForOpen.current) {
			generatedForOpen.current = true;
			generateMutation.mutate();
		}
	}, [isOpen, generateMutation]);

	function handleClose(open: boolean) {
		if (!open && !generateMutation.isPending) {
			setResetUrl(null);
			setExpiresAt(null);
			setCopied(false);
			onOpenChange(false);
		}
	}

	async function handleCopy() {
		if (!resetUrl) return;
		try {
			await navigator.clipboard.writeText(resetUrl);
			setCopied(true);
			toast.success("Link copied to clipboard");
		} catch {
			toast.error("Unable to copy the link. Please copy it manually.");
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[480px] flex flex-col p-6">
				<DialogHeader className="shrink-0">
					<DialogTitle>Generate reset link</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-5">
					<p className="text-sm text-muted-foreground">
						This generates a single-use link for{" "}
						<span className="font-medium text-foreground">
							{user.firstName} {user.lastName}
						</span>{" "}
						({user.email}) that expires 24 hours after it is generated and does
						not require their email. Share it through a trusted channel such as
						a direct message or call.
					</p>

					{generateMutation.isPending ? (
						<div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							Generating link...
						</div>
					) : generateMutation.isError ? (
						<div className="flex flex-col items-start gap-3 py-2">
							<p className="text-sm text-destructive">
								{generateMutation.error?.message ??
									"Unable to generate the link. Please try again."}
							</p>
							<Button
								variant="outline"
								onClick={() => generateMutation.mutate()}
							>
								<RefreshCw className="mr-2 size-4" />
								Try again
							</Button>
						</div>
					) : resetUrl ? (
						<div className="flex flex-col gap-2">
							<Label htmlFor="reset-link" className="text-sm font-medium">
								Reset link
							</Label>
							<div className="flex gap-2">
								<Input
									id="reset-link"
									value={resetUrl}
									readOnly
									onFocus={(e) => e.target.select()}
									className="border-border bg-muted font-mono text-xs text-foreground"
								/>
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-10 shrink-0 border-border"
									onClick={handleCopy}
									aria-label="Copy reset link"
								>
									{copied ? (
										<Check className="size-4 text-primary" />
									) : (
										<Copy className="size-4" />
									)}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Expires {expiresAt ? formatExpiry(expiresAt) : ""}. Generating a
								new link invalidates the previous one.
							</p>
						</div>
					) : null}
				</div>

				<DialogFooter className="flex gap-3 pt-2 shrink-0">
					<Button
						variant="outline"
						onClick={() => handleClose(false)}
						disabled={generateMutation.isPending}
						className="border-border text-foreground hover:bg-muted"
					>
						Close
					</Button>
					<BrandButton
						disabled={generateMutation.isPending}
						onClick={() => generateMutation.mutate()}
					>
						{generateMutation.isPending ? (
							<Loader2 className="size-4 animate-spin mr-1.5" />
						) : (
							<RefreshCw className="size-4 mr-1.5" />
						)}
						Regenerate
					</BrandButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
