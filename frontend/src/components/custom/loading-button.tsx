import { forwardRef, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "#/lib/utils";

interface LoadingButtonProps extends ComponentProps<typeof Button> {
	loading?: boolean;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
	({ loading, disabled, className, children, ...props }, ref) => (
		<Button
			ref={ref}
			disabled={disabled || loading}
			className={cn("gap-2", className)}
			{...props}
		>
			{loading && <Spinner className="size-4" />}
			{children}
		</Button>
	),
);
LoadingButton.displayName = "LoadingButton";
