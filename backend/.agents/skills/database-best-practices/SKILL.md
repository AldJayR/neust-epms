---
name: database-design-analysis
description: Rigorous, repository-aware relational database design analysis — functional dependencies, normalization (1NF/2NF/3NF), candidate keys, deep transitive dependency chains, diamond dependencies, dependency cycles, lossless-join and dependency-preservation verification, and anomaly analysis. Use this whenever the user asks to review, audit, validate, or design a database schema, asks whether a schema or table "is normalized" or "is 3NF," asks about redundancy/anomalies/data integrity risk in a schema, or asks for a schema refactor or migration plan. Trigger even if the user only shares a schema/migration/ORM models without explicitly asking for "normalization" — analyzing whether a schema is sound is the default behavior for any nontrivial schema review or design request.
---

# Database Design Analysis

A skill for analyzing a relational database as a system — not by checking
whether tables have primary and foreign keys, but by reconstructing its
functional dependencies and testing them against relational theory.

## Why this matters

A surrogate primary key, a UUID, or an ORM-generated schema does not
eliminate dependencies among non-key attributes. A table can have a clean
PK, sensible-looking foreign keys, and no obvious duplicate columns, and
still be riddled with partial dependencies, transitive dependencies, or
dependency cycles that cause real insertion/update/deletion anomalies once
the system is in production. The job here is to find those before they're
load-bearing.

## Before you start: read the worked example

`references/worked-example.md` carries one small schema through every
phase below — FD derivation, closures, minimal cover, 2NF/3NF violations,
a diamond, a cycle, and lossless-join/dependency-preservation proofs — with
the reasoning shown at each step, not just asserted. Read it once before
producing your first full analysis in a conversation. It also shows how
depth should scale: some relations get a one-line pass, the ones with real
findings get full proofs. Don't give every table in a real schema the same
depth uniformly — scale it to where the findings actually are.

## Operating principle: analyze before you touch anything

Do not modify migrations, schema files, ORM models, or SQL until analysis
is complete. The default sequence is: discover → reconstruct → infer →
validate → analyze → report → propose → modify only when explicitly
authorized. Don't assume the user's proposed design is correct. Don't
assume the existing implementation is correct just because it's in
production, ORM-generated, or has no obviously duplicate columns.

If the user asks only for analysis, stop after the report. If they ask for
implementation, analyze first, then implement — and only implement the
parts they've confirmed.

## Evidence classification

Every dependency and every conclusion gets one of four confidence labels.
Never present a suspected dependency as mathematically confirmed.

| Label | Meaning |
|---|---|
| **Confirmed** | Established by DB constraints, explicit business rules, active application logic, or tests |
| **Strongly Inferred** | Multiple consistent implementation signals, but not formally enforced |
| **Suspected** | Plausible from naming or data structure, limited evidence |
| **Unknown** | Cannot be determined without more business-rule or runtime evidence |

Do not infer functional dependencies from sample data alone — a dataset can
accidentally satisfy a dependency the business rules don't actually
require.

## Workflow

### 1. Discover
Find every database-relevant source: schema/migration files, ORM models,
raw SQL, stored procedures/triggers/views, seed/fixture data, tests,
schema docs, ADRs. Don't treat any single layer (latest migration, ORM
models) as the complete source of truth — cross-reference them.

When sources conflict, don't resolve the conflict silently. Report it. If
the ORM declares a field unique but no DB-level unique constraint exists,
that's an enforcement gap worth flagging on its own, independent of any
normalization finding.

### 2. Reconstruct the effective schema
For every relation: attributes, types, primary key, candidate keys,
superkeys, foreign keys, constraints, nullability. Classify what the
relation represents (entity, relationship/associative, lookup, transaction,
audit/history, snapshot). Flag relations that look like they're carrying
more than one independent business concept.

### 3. Reconstruct business rules → functional dependencies
Pull rules from constraints, code, validation, tests, and naming
conventions, and translate the ones you're confident about into FDs
(`X -> Y`). Classify each by evidence strength per the table above.

### 4. Check 1NF
Look for comma-separated values, repeated/numbered columns, or relational
data hidden in JSON/arrays. Don't auto-decompose composite or JSON values —
first determine whether the components need independent querying,
validation, uniqueness, or authorization. A JSON blob that's genuinely
opaque and never queried into isn't a 1NF violation.

### 5. Derive the full FD set and apply Armstrong's axioms
Use reflexivity, augmentation, and transitivity (and the derived rules —
union, decomposition, pseudotransitivity) to find implied dependencies,
not just the ones directly visible in a single constraint. Compute
attribute closures where a key or a hidden determinant isn't obvious.
Derive a minimal cover before doing 3NF or decomposition work. See
`references/worked-example.md` §4–5 for the closure/minimal-cover mechanics
worked in full.

### 6. Candidate keys, then 2NF, then 3NF
Don't rely only on the declared primary key. For every composite candidate
key, check whether a non-prime attribute depends on a proper subset of it
(partial dependency → 2NF violation). For every non-trivial `X -> A`,
confirm `X` is a superkey or `A` is prime — otherwise it's a 3NF violation.
Don't stop at the first violation found in a relation; check every
attribute.

### 7. Deep transitive chains, diamonds, and cycles
Build the dependency graph and follow chains past the immediately adjacent
dependency — `A -> B -> C -> D -> E` matters, not just `A -> B`. Explicitly
look for diamonds (one determinant, two paths, one converging fact) and
cycles (including cross-table FK cycles like `department -> employee ->
department`). Neither is automatically a bug:
- Classify diamonds as **Benign / Redundant / Ambiguous / Conflicting /
  Security-Sensitive / Performance-Oriented** — an intentional
  override-with-fallback pattern is a legitimate Conflicting-by-design
  diamond, not an error, as long as the precedence rule is documented and
  enforced.
- Classify cycles by asking whether they're a legitimate one-to-one /
  self-referential pattern requiring a nullable FK to break an insertion
  deadlock, versus genuine unclear ownership.

`references/worked-example.md` §9–10 shows both classifications worked
through on real examples — read it before calling a diamond or a cycle a
"finding" so the severity and framing land correctly.

### 8. Decomposition, lossless join, dependency preservation
Base decomposition decisions on dependencies and semantics, not table
width. For every proposed decomposition, prove losslessness (does the
intersection of the two resulting relations functionally determine at
least one of them, under F+?) and check whether every original dependency
is preserved without requiring a cross-table join or trigger to enforce.
Report both, separately — a decomposition can be lossless but not
dependency-preserving, or vice versa. Never recommend a decomposition
without doing this check.

### 9. Anomalies
For every normalization issue found, name the concrete insertion, update,
and deletion anomaly it causes — tied to actual schema behavior, not
generic normal-form language.

## Output

Use this structure for a full analysis:

1. Executive Summary
2. Repository Evidence Inspected
3. Assumptions and Business Rules
4. Effective Schema Inventory
5. Candidate Keys and Superkeys
6. Functional Dependencies
7. Closures / Minimal Cover (only where non-obvious — see worked example)
8. 1NF Analysis
9. 2NF and Partial Dependency Analysis
10. 3NF Analysis
11. Deep Transitive Dependency Chains
12. Diamond Dependency Analysis
13. Dependency Cycle Analysis
14. Table and Attribute Decomposition Opportunities
15. Lossless Join Verification
16. Dependency Preservation Verification
17. Anomaly Analysis
18. Prioritized Findings
19. Recommended Final Schema
20. Implementation Plan (only if the user asked for implementation)

For a small, scoped question ("is this one table normalized?"), don't force
all 20 sections — answer the specific question with the same rigor (show
the FDs, show the closure or 2NF/3NF check that actually applies) but skip
sections that don't apply. State briefly that you're doing a scoped check
rather than a full schema audit.

Format individual findings like this:

```
Finding: [Title]
Severity: Critical / High / Medium / Low / Informational
Confidence: Confirmed / Strongly Inferred / Suspected / Unknown
Relation: "table_name"
Dependency: "X -> Y"
Structure: Linear / Partial / Transitive / Diamond / Cycle / Combined
Evidence: [files, constraints, code, business rules]
Problem: [the exact issue]
Business Rule: [the rule creating the dependency]
Anomaly Risk: [insertion / update / deletion, tied to real rows]
Recommendation: [proposed change]
Lossless Join Verification: [reasoning, if decomposition proposed]
Dependency Preservation Verification: [reasoning, if decomposition proposed]
```

## Quality gate — before you finish

- Every relation was actually analyzed, not just the ones with obvious PK/FK issues
- Business rules were kept separate from your own assumptions, and each carries a confidence label
- Surrogate keys were not treated as proof of normalization
- Composite keys were checked for partial dependencies
- Non-key determinants were checked for transitive dependencies, including deep chains, not just adjacent ones
- Diamonds and cycles were both searched for and classified, not just flagged as present/absent
- Every proposed decomposition has both a lossless-join proof and a dependency-preservation check
- Every anomaly claim is tied to a concrete insertion/update/deletion scenario, not generic normal-form language
- Nothing was modified before analysis was presented, unless the user had already authorized implementation

Avoid shallow conclusions like "this looks normalized," "this is 3NF," or
"split this table" without the FD, closure, or proof behind them. The bar
is production architecture review — not a linter pass.