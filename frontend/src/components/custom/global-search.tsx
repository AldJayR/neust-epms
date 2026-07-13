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
	proposals: "bg-violet-50 dark:bg-violet-950/30",
	projects: "bg-blue-50 dark:bg-blue-950/30",
	reports: "bg-amber-50 dark:bg-amber-950/30",
	moas: "bg-emerald-50 dark:bg-emerald-950/30",
	users: "bg-slate-50 dark:bg-slate-950/30",
};

const TYPE_LABELS: Record<SearchType, string> = {
	all: "All",
	proposals: "Proposals",
	projects: "Projects",
	reports: "Reports",
	moas: "MOAs",
	users: "Users",
};

const RECENTS_KEY = "epms.recentSearches";
const RECENTS_MAX = 8;

interface RecentEntry {
	query: string;
	type: SearchType;
}

function loadRecents(): RecentEntry[] {
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
	localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, RECENTS_MAX)));
}

interface GlobalSearchProps {
	user: AuthUser;
}

export function GlobalSearch({ user }: GlobalSearchProps) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [debounced, setDebounced] = React.useState("");
	const [type, setType] = React.useState<SearchType>("all");
	const navigate = useNavigate();

	const allowedTypes = React.useMemo(() => {
		const base: SearchType[] = ["all", "proposals", "projects", "reports"];
		if (isRETChair(user) || isDirector(user)) base.push("moas");
		if (isSuperAdmin(user)) base.push("users");
		return base;
	}, [user]);

	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	React.useEffect(() => {
		if (open) {
			setQuery("");
			setDebounced("");
		}
	}, [open]);

	React.useEffect(() => {
		const t = setTimeout(() => setDebounced(query), 250);
		return () => clearTimeout(t);
	}, [query]);

	const { data, isFetching } = useQuery({
		queryKey: ["global-search", debounced, type],
		queryFn: () => globalSearchFn({ data: { q: debounced, type, limit: 5 } }),
		enabled: debounced.trim().length > 0,
	});

	const results = data?.results ?? [];
	const recents = loadRecents();

	const grouped = React.useMemo(
		() =>
			(["proposals", "projects", "reports", "moas", "users"] as const)
				.map((t) => ({ type: t, items: results.filter((r) => r.type === t) }))
				.filter((g) => g.items.length > 0),
		[results],
	);

	const goTo = React.useCallback(
		(item: SearchResultItem) => {
			pushRecent({ query, type });
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
			setOpen(false);
		},
		[query, type, navigate],
	);

	const runRecent = (entry: RecentEntry) => {
		setType(entry.type);
		setQuery(entry.query);
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="relative flex h-8 w-full max-w-[212px] items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Open global search"
			>
				<Search className="size-4 shrink-0 text-muted-foreground" />
				<span className="flex-1 text-left">Type to search…</span>
				<kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
					⌘K
				</kbd>
			</button>

			<CommandDialog open={open} onOpenChange={setOpen}>
				<Command shouldFilter={false} className="gap-0">
					<CommandInput
						value={query}
						onValueChange={setQuery}
						placeholder="Search proposals, projects, reports…"
						autoFocus
					/>

					<div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
						{allowedTypes.map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setType(t)}
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
