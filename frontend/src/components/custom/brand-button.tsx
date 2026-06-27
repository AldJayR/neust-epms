import type { ComponentProps, Ref } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "#/lib/utils";

interface BrandButtonProps extends ComponentProps<typeof Button> {
	ref?: Ref<HTMLButtonElement>;
}

export function BrandButton({ className, children, ref, ...props }: BrandButtonProps) {
	return (
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
	);
}
