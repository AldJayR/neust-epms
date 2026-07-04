import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";

interface AuthPageLayoutProps {
	children: ReactNode;
	title: string;
	description: string;
	error?: string | null;
	footer?: ReactNode;
	headerAction?: ReactNode;
}

export function AuthPageLayout({
	children,
	title,
	description,
	error,
	footer,
	headerAction,
}: AuthPageLayoutProps) {
	return (
		<section className="w-full max-w-[480px] rounded-xl p-6">
			<div className="flex items-center gap-2.5 mb-5">
				<img
					src="/images/extension-services-logo.png"
					alt="NEUST Extension Services"
					className="h-10 w-10 object-contain shrink-0"
				/>
				<div className="flex flex-col leading-tight">
					<span className="text-sm font-semibold text-foreground">
						Nueva Ecija University of Science and Technology
					</span>
					<span className="text-xs text-muted-foreground">
						Extension Services Department
					</span>
				</div>
			</div>
			<header className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-base font-semibold tracking-tight text-foreground">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				{headerAction && <div className="shrink-0 pt-2.5">{headerAction}</div>}
			</header>

			{error && (
				<Alert variant="destructive" className="mt-4">
					{error}
				</Alert>
			)}

			{children}

			{footer && (
				<p className="pt-4 text-center text-sm leading-5 text-zinc-600">
					{footer}
				</p>
			)}
		</section>
	);
}
