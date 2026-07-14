import robotoLatinWghtUrl from "@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2?url";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { Devtools } from "../components/devtools";
import { TooltipProvider } from "../components/ui/tooltip";
import type { AuthContext } from "../lib/auth";
import { getCurrentUserFn } from "@/features/auth";
import { getCachedUser, isCacheStale, setCachedUser } from "../lib/auth-cache";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	auth: AuthContext;
}

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;var stored=window.localStorage.getItem('theme');var theme=stored==='dark'||stored==='light'?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');root.classList.remove('light','dark');root.classList.add(theme);root.setAttribute('data-theme',theme);root.style.colorScheme=theme;}catch(e){}})();`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		let user = getCachedUser();
		if (typeof window === "undefined" || isCacheStale()) {
			user = await getCurrentUserFn();
			setCachedUser(user);
		}

		return {
			auth: {
				user,
				isAuthenticated: !!user,
			},
		};
	},
	loader: () => void 0,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "NEUST Extension Services",
			},
		],
		links: [
			{
				rel: "preload",
				href: robotoLatinWghtUrl,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	notFoundComponent: NotFound,
	errorComponent: RootError,
	shellComponent: RootDocument,
});

function RootError({ reset }: { error: Error; reset: () => void }) {
	const router = useRouter();

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
			<h1 className="text-4xl font-semibold">Something went wrong</h1>
			<p className="mt-4 max-w-md text-muted-foreground">
				We could not load this page. Try again, or return home if the problem
				continues.
			</p>
			<div className="mt-8 flex gap-3">
				<button
					type="button"
					onClick={() => {
						router.invalidate();
						reset();
					}}
					className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Try again
				</button>
				<Link
					to="/"
					className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted"
				>
					Go home
				</Link>
			</div>
		</div>
	);
}

function NotFound() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
			<h1 className="text-4xl font-semibold">404</h1>
			<p className="mt-4 text-xl text-muted-foreground">
				Oops! The page you're looking for doesn't exist.
			</p>
			<Link
				to="/"
				className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Go home
			</Link>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const isPending = useRouterState({ select: (s) => s.isLoading });

	useEffect(() => {
		let disconnectToastId: string | number | undefined;
		let countdownInterval: ReturnType<typeof setInterval> | undefined;
		let remainingSeconds = 5;

		const handleOffline = () => {
			remainingSeconds = 5;
			if (disconnectToastId) toast.dismiss(disconnectToastId);
			if (countdownInterval) clearInterval(countdownInterval);

			disconnectToastId = toast.custom(
				() => (
					<div className="relative flex items-center gap-4 border border-border bg-background rounded-xl shadow-md p-4 w-[356px] overflow-hidden">
						<div className="flex size-9 items-center justify-center rounded-full bg-red-50 text-red-500 shrink-0">
							<WifiOff className="size-5" />
						</div>
						<div className="flex flex-col text-left">
							<span className="text-[14px] font-semibold text-foreground leading-tight">
								Connection Lost
							</span>
							<span className="text-[12px] text-muted-foreground mt-1 leading-tight">
								Reconnecting in {remainingSeconds} seconds...
							</span>
						</div>
						<div className="ml-auto shrink-0 text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
						</div>
					</div>
				),
				{
					duration: Number.POSITIVE_INFINITY,
				},
			);

			countdownInterval = setInterval(() => {
				remainingSeconds -= 1;
				if (remainingSeconds <= 0) {
					remainingSeconds = 5;
				}
				toast.custom(
					() => (
						<div className="relative flex items-center gap-4 border border-border bg-background rounded-xl shadow-md p-4 w-[356px] overflow-hidden">
							<div className="flex size-9 items-center justify-center rounded-full bg-red-50 text-red-500 shrink-0">
								<WifiOff className="size-5" />
							</div>
							<div className="flex flex-col text-left">
								<span className="text-[14px] font-semibold text-foreground leading-tight">
									Connection Lost
								</span>
								<span className="text-[12px] text-muted-foreground mt-1 leading-tight">
									Reconnecting in {remainingSeconds} seconds...
								</span>
							</div>
							<div className="ml-auto shrink-0 text-muted-foreground">
								<Loader2 className="size-4 animate-spin" />
							</div>
						</div>
					),
					{
						id: disconnectToastId,
						duration: Number.POSITIVE_INFINITY,
					},
				);
			}, 1000);
		};

		const handleOnline = () => {
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = undefined;
			}
			if (disconnectToastId) {
				toast.dismiss(disconnectToastId);
				disconnectToastId = undefined;
			}
			toast.custom(
				() => (
					<div className="relative flex items-center gap-4 border border-border bg-background rounded-xl shadow-md p-4 w-[356px] overflow-hidden">
						<div className="flex size-9 items-center justify-center rounded-full bg-green-50 text-green-600 shrink-0">
							<Wifi className="size-5" />
						</div>
						<div className="flex flex-col text-left">
							<span className="text-[14px] font-semibold text-foreground leading-tight">
								Connection Restored
							</span>
							<span className="text-[12px] text-muted-foreground mt-1 leading-tight">
								You are back online.
							</span>
						</div>
					</div>
				),
				{
					duration: 4000,
				},
			);
		};

		window.addEventListener("offline", handleOffline);
		window.addEventListener("online", handleOnline);

		// If initially offline
		if (!navigator.onLine) {
			handleOffline();
		}

		return () => {
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("online", handleOnline);
			if (countdownInterval) clearInterval(countdownInterval);
		};
	}, []);

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme init script prevents flash */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				{isPending && <div className="global-loading-bar" />}
				<TooltipProvider>{children}</TooltipProvider>
				<Toaster position="top-right" />
				<Devtools />
				<Scripts />
			</body>
		</html>
	);
}
