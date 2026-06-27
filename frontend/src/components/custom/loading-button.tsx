import type { ComponentProps, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "#/lib/utils";

interface LoadingButtonProps extends ComponentProps<typeof Button> {
	loading?: boolean;
	ref?: Ref<HTMLButtonElement>;
}

export function LoadingButton({ loading, disabled, className, children, ref, ...props }: LoadingButtonProps) {
	return (
		<Button
			ref={ref}
			disabled={disabled || loading}
			className={cn("gap-2", className)}
			{...props}
		>
			{loading && <Spinner className="size-4" />}
			{children}
		</Button>
	);
}
