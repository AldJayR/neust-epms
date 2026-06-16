import robotoLatinWghtUrl from "@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2?url";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Devtools } from "../components/devtools";
import type { AuthContext } from "../lib/auth";
import { getCurrentUserFn } from "../lib/auth.functions";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	auth: AuthContext;
}

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;root.classList.remove('light','dark');root.classList.add('light');root.setAttribute('data-theme','light');root.style.colorScheme='light';window.localStorage.setItem('theme','light');}catch(e){}})();`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		const user = await getCurrentUserFn();

		return {
			auth: {
				user,
				isAuthenticated: !!user,
			},
		};
	},
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
	shellComponent: RootDocument,
});

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

// biome-ignore lint/security/noDangerouslySetInnerHtml: theme init script prevents flash
function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				{children}
				<Toaster position="top-right" />
				<Devtools />
				<Scripts />
			</body>
		</html>
	);
}
