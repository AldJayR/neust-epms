import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	ClipboardCheck,
	Clock,
	CornerDownLeft,
	FileText,
	FolderOpen,
	Handshake,
	Search,
	User,
} from "lucide-react";
import * as React from "react";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import type { AuthUser } from "@/lib/auth";
import { isDirector, isRETChair, isSuperAdmin } from "@/lib/permissions";
import {
	globalSearchFn,
	type SearchResultItem,
	type SearchType,
} from "@/features/search";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
	all: null,
	proposals: <FileText className="size-4 text-violet-500" />,
	projects: <FolderOpen className="size-4 text-blue-500" />,
	reports: <ClipboardCheck className="size-4 text-amber-500" />,
	moas: <Handshake className="size-4 text-emerald-500" />,
	users: <User className="size-4 text-slate-500" />,
};

const TYPE_BG_CLASSES = {
	all: "",
	proposals: "bg-violet-50 dark:bg-muted/80",
	projects: "bg-blue-50 dark:bg-muted/80",
	reports: "bg-amber-50 dark:bg-muted/80",
	moas: "bg-emerald-50 dark:bg-muted/80",
	users: "bg-slate-50 dark:bg-muted/80",
};

const TYPE_LABELS: Record<SearchType, string> = {
	all: "All",
	proposals: "Proposals",
	projects: "Projects",
	reports: "Reports",
	moas: "MOAs",
	users: "Users",
};

const RECENTS_KEY = "epms.recentSearches:v1";
const RECENTS_MAX = 8;

interface RecentEntry {
	query: string;
	type: SearchType;
}

interface SearchState {
	open: boolean;
	query: string;
	type: SearchType;
}

type SearchAction =
	| { type: "open"; open: boolean }
	| { type: "query"; query: string }
	| { type: "type"; searchType: SearchType }
	| { type: "recent"; entry: RecentEntry };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
	switch (action.type) {
		case "open":
			return {
				...state,
				open: action.open,
				query: action.open ? "" : state.query,
			};
		case "query":
			return { ...state, query: action.query };
		case "type":
			return { ...state, type: action.searchType };
		case "recent":
			return { ...state, type: action.entry.type, query: action.entry.query };
	}
}

function loadRecents(): RecentEntry[] {
	if (typeof window === "undefined") return [];

	try {
		const raw = localStorage.getItem(RECENTS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(e): e is RecentEntry =>
				typeof e?.query === "string" && typeof e?.type === "string",
		);
	} catch {
		return [];
	}
}

function pushRecent(entry: RecentEntry) {
	const list = loadRecents().filter(
		(e) => !(e.query === entry.query && e.type === entry.type),
	);
	list.unshift(entry);
	const next = list.slice(0, RECENTS_MAX);
	localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
	return next;
}

interface GlobalSearchProps {
	user: AuthUser;
}

export function GlobalSearch({ user }: GlobalSearchProps) {
	const [searchState, dispatch] = React.useReducer(searchReducer, {
		open: false,
		query: "",
		type: "all",
	});
	const { open, query, type } = searchState;
	const [recents, setRecents] = React.useState<RecentEntry[]>(loadRecents);
	const deferredQuery = React.useDeferredValue(query);
	const navigate = useNavigate();

	const allowedTypes = (() => {
		const base: SearchType[] = ["all", "proposals", "projects", "reports"];
		if (isRETChair(user) || isDirector(user)) base.push("moas");
		if (isSuperAdmin(user)) base.push("users");
		return base;
	})();

	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				dispatch({ type: "open", open: true });
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	const { data, isFetching } = useQuery({
		queryKey: ["global-search", deferredQuery, type],
		queryFn: () =>
			globalSearchFn({ data: { q: deferredQuery, type, limit: 5 } }),
		enabled: deferredQuery.trim().length > 0,
		staleTime: 30_000,
	});

	const results = data?.results ?? [];
	const grouped = (["proposals", "projects", "reports", "moas", "users"] as const)
		.map((resultType) => ({
			type: resultType,
			items: results.filter((result) => result.type === resultType),
		}))
		.filter((group) => group.items.length > 0);

	const goTo = (item: SearchResultItem) => {
		setRecents(pushRecent({ query, type }));
		switch (item.type) {
				case "proposals":
					navigate({
						to: "/proposals/$proposalId",
						params: { proposalId: item.id },
					});
					break;
				case "projects":
				case "reports":
					navigate({
						to: "/projects/$projectId",
						params: { projectId: item.id },
					});
					break;
				case "moas":
					navigate({ to: "/moas/$moaId", params: { moaId: item.id } });
					break;
				case "users":
					navigate({ to: "/admin/users" });
					break;
		}
		dispatch({ type: "open", open: false });
	};

	const runRecent = (entry: RecentEntry) => {
		dispatch({ type: "recent", entry });
	};

	const handleOpenChange = (nextOpen: boolean) => {
		dispatch({ type: "open", open: nextOpen });
	};

	return (
		<>
			<button
				type="button"
				onClick={() => handleOpenChange(true)}
				className="relative flex h-8 w-full max-w-[212px] items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Open global search"
			>
				<Search className="size-4 shrink-0 text-muted-foreground" />
				<span className="flex-1 text-left">Type to search…</span>
				<kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
					⌘K
				</kbd>
			</button>

			<CommandDialog open={open} onOpenChange={handleOpenChange}>
				<Command shouldFilter={false} className="gap-0">
					<CommandInput
						value={query}
					onValueChange={(value) => dispatch({ type: "query", query: value })}
						placeholder="Search proposals, projects, reports…"
						autoFocus
					/>

					<div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
						{allowedTypes.map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => dispatch({ type: "type", searchType: t })}
								className={cn(
									"rounded-full px-3 py-1 text-xs font-medium transition-all shadow-none hover:scale-[1.02]",
									type === t
										? "bg-primary text-primary-foreground shadow-xs"
										: "bg-background border border-border text-muted-foreground hover:bg-accent hover:text-foreground",
								)}
							>
								{TYPE_LABELS[t]}
							</button>
						))}
					</div>

					<CommandList className="max-h-[360px]">
						{query.trim() === "" ? (
							recents.length > 0 && (
								<CommandGroup heading="Recent">
									{recents.map((r) => (
										<CommandItem
											key={`${r.query}-${r.type}`}
											value={`recent-${r.query}-${r.type}`}
											onSelect={() => runRecent(r)}
											className="flex items-center gap-3 px-3 py-2.5"
										>
											<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
												<Clock className="size-4" />
											</div>
											<span className="flex-1 font-medium text-sm truncate">
												{r.query}
											</span>
											<span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
												{TYPE_LABELS[r.type]}
											</span>
										</CommandItem>
									))}
								</CommandGroup>
							)
						) : (
							<>
								{grouped.map((g) => (
									<CommandGroup key={g.type} heading={TYPE_LABELS[g.type]}>
										{g.items.map((item) => (
											<CommandItem
												key={`${item.type}-${item.id}`}
												value={`${item.type}-${item.id}`}
												onSelect={() => goTo(item)}
												className="flex items-center gap-3 px-3 py-2.5"
											>
												<div
													className={cn(
														"flex size-8 shrink-0 items-center justify-center rounded-lg",
														TYPE_BG_CLASSES[item.type],
													)}
												>
													{TYPE_ICONS[item.type]}
												</div>
												<div className="flex min-w-0 flex-1 flex-col gap-0.5">
													<span className="truncate font-medium text-foreground text-sm leading-none">
														{item.title}
													</span>
													{item.subtitle && (
														<span className="truncate text-xs text-muted-foreground">
															{item.subtitle}
														</span>
													)}
												</div>
												<CornerDownLeft className="size-4 shrink-0 text-muted-foreground opacity-0 group-data-selected/command-item:opacity-100 group-hover/command-item:opacity-100 transition-opacity" />
											</CommandItem>
										))}
									</CommandGroup>
								))}
								<CommandEmpty>
									{isFetching ? "Searching…" : "No results found."}
								</CommandEmpty>
							</>
						)}
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	);
}
