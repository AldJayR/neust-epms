import { forwardRef, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "#/lib/utils";

export const BrandButton = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
	({ className, children, ...props }, ref) => (
		<Button
			ref={ref}
			className={cn(
				"bg-brand-primary text-white hover:bg-brand-primary/90 rounded-lg gap-2",
				className,
			)}
			{...props}
		>
			{children}
		</Button>
	),
);
BrandButton.displayName = "BrandButton";
