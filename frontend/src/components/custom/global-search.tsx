import { CornerDownLeft, Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";
import {
	isDirector,
	isRETChair,
	isSuperAdmin,
} from "@/lib/permissions";
import type { AuthUser } from "@/lib/auth";
import {
	globalSearchFn,
	type SearchResultItem,
	type SearchType,
} from "@/lib/search.functions";

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
		queryFn: () =>
			globalSearchFn({ data: { q: debounced, type, limit: 5 } }),
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
					navigate({ to: "/proposals/$proposalId", params: { proposalId: item.id } });
					break;
				case "projects":
				case "reports":
					navigate({ to: "/projects/$projectId", params: { projectId: item.id } });
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
				className="relative flex h-8 w-full max-w-[212px] items-center gap-2 rounded-lg bg-background pl-8 pr-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
				aria-label="Open global search"
			>
				<Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
				<span className="flex-1 text-left">Type to search…</span>
				<kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
					⌘K
				</kbd>
			</button>

			<CommandDialog open={open} onOpenChange={setOpen}>
				<Command shouldFilter={false} className="gap-0">
					<div className="flex items-center gap-2 border-b px-3">
						<CommandInput
							value={query}
							onValueChange={setQuery}
							placeholder="Search proposals, projects, reports…"
							className="h-11 flex-1 border-0 focus-visible:ring-0"
							autoFocus
						/>
					</div>

					<div className="flex flex-wrap items-center gap-1 border-b px-3 py-2">
						{allowedTypes.map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setType(t)}
								className={cn(
									"rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
									type === t
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground hover:bg-accent",
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
										>
											<Search className="size-4 text-muted-foreground" />
											<span className="flex-1">{r.query}</span>
											<span className="text-xs text-muted-foreground">
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
											>
												<div className="flex min-w-0 flex-1 flex-col">
													<span className="truncate">{item.title}</span>
													{item.subtitle && (
														<span className="truncate text-xs text-muted-foreground">
															{item.subtitle}
														</span>
													)}
												</div>
												<CornerDownLeft className="size-4 shrink-0 text-muted-foreground" />
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
