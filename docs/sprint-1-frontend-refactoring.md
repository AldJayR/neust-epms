# Sprint 1: Frontend Architecture Refactoring

## Goal
Restructure the frontend codebase for modularity, maintainability, and clear domain boundaries — no logic changes, only file moves, splits, and import updates.

## Scope
6 phases, ~50 files touched, single commit.

| Phase | Description | Files |
|-------|-------------|-------|
| P1 | Foundation: `config/api.ts`, `lib/api/client.ts`, `src/types/`, barrel exports, move layout | ~12 new, 1 moved, 1 updated |
| P2 | Split `lib/dashboard.functions.ts` (925 lines → 6 feature files) | 1 deleted, 6 created, ~15 import updates |
| P3 | Move 14 files out of `director/` to proper feature folders | ~14 moved, ~10 import updates |
| P4 | Deduplicate `faculty-directory-columns.tsx` | 2 moved, 2 import updates |
| P5 | Clean up remaining director/ files (PDF viewer, create-moa-modal) | ~8 moved, 1 folder deleted |
| P6 | Standardize imports to `@/` alias + barrel export sweep | ~30 import updates |

## Principles
- DRY: Single source for types, config, column definitions
- KISS: No new abstraction layers
- YAGNI: Types stay in feature files if not shared
- Modular: Features own their code, never import from other features
- High cohesion: All related code lives together

## Target Structure
```
src/
├── components/
│   ├── ui/                  # shadcn (unchanged)
│   ├── custom/              # shared custom components (unchanged)
│   └── layout/              # MOVED from features/layout/
├── features/
│   ├── action-center/       
│   ├── admin/               
│   ├── archives/            
│   ├── auth/                
│   ├── dashboard/           # role-based: director/, faculty/, ret/
│   ├── faculty/             # directory page + columns (single source)
│   ├── moa/                 # details + repository
│   ├── projects/            # hub + details + charts + wizard
│   ├── proposals/           # review + lifecycle stepper + create modal
│   ├── reports/             # list + submit modal
│   └── ret/                 # dash + monitoring + thin faculty wrapper
├── hooks/                   # shared hooks (unchanged)
├── lib/                     # refactored
│   ├── api/client.ts        # API_BASE + getErrorMessage
│   ├── utils/               # cn, pagination, etc.
│   ├── auth/                # types, cache, permissions
│   └── server/              # session, supabase (server-only)
├── types/                   # shared domain types
├── config/api.ts            # API_BASE (single source)
├── routes/                  # unchanged
└── router.tsx
```

## Key Decisions
- PDF viewer co-located with projects (its only consumer) — YAGNI
- Two column definitions kept separate (director vs RET have different columns) — no forced dedup
- `getErrorMessage()` extracted to `lib/api/client.ts` — eliminates circular import risk
- All changes in one coordinated, verified commit

## Rollout Sequence (within the commit)
1. Create config/api.ts
2. Create lib/api/client.ts
3. Create src/types/
4. Create feature functions.ts (split from dashboard.functions.ts)
5. Create barrel exports
6. Move layout → components/
7. Move files out of director/
8. Update ALL imports
9. Delete old files
10. Run lint + typecheck → fix → commit

## Verification Gates
- `npm run lint` (frontend) — Biome must pass
- `npm run typecheck` (frontend) — TypeScript must pass
- No runtime behavior changes (purely structural)
