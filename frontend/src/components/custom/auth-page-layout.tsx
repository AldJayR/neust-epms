import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";

interface AuthPageLayoutProps {
	children: ReactNode;
	title: string;
	description: string;
	error?: string | null;
	footer?: ReactNode;
}

export function AuthPageLayout({
	children,
	title,
	description,
	error,
	footer,
}: AuthPageLayoutProps) {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-8">
			<section className="w-full max-w-[480px] rounded-xl p-6">
				<header className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground">{description}</p>
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
		</main>
	);
}
