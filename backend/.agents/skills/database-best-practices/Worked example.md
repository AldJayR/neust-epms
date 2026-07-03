# Worked Example: Full Analysis Walkthrough

This is a single, compact schema carried through every phase of the analysis
skill, end to end. It is intentionally small (5 tables) but constructed so
that it contains one real instance of each major structure the skill asks
you to detect: a partial dependency, a transitive chain, a diamond, and a
cycle. Use this as a calibration reference for output depth and format —
not as a template to copy values from.

---

## 0. The Schema (as reconstructed from repository evidence)

```sql
CREATE TABLE department (
  department_id   UUID PRIMARY KEY,
  department_name TEXT NOT NULL,
  manager_id      UUID REFERENCES employee(employee_id),  -- nullable, deferred
  office_id       UUID REFERENCES office(office_id) NOT NULL
);

CREATE TABLE office (
  office_id  UUID PRIMARY KEY,
  city_id    UUID REFERENCES city(city_id) NOT NULL,
  floor      INT
);

CREATE TABLE city (
  city_id     UUID PRIMARY KEY,
  city_name   TEXT NOT NULL,
  country_id  UUID REFERENCES country(country_id) NOT NULL
);

CREATE TABLE country (
  country_id   UUID PRIMARY KEY,
  country_name TEXT NOT NULL
);

CREATE TABLE employee (
  employee_id     UUID PRIMARY KEY,
  department_id   UUID REFERENCES department(department_id) NOT NULL,
  office_id       UUID REFERENCES office(office_id),  -- nullable "override"
  employee_name   TEXT NOT NULL
);

CREATE TABLE order_line (
  order_id      UUID NOT NULL,
  product_id    UUID NOT NULL,
  quantity      INT NOT NULL,
  order_date    DATE NOT NULL,      -- depends only on order_id
  product_name  TEXT NOT NULL,      -- depends only on product_id
  product_price NUMERIC NOT NULL,   -- depends only on product_id
  PRIMARY KEY (order_id, product_id)
);
```

Evidence sources (illustrative — in a real run, cite actual files):
- `migrations/0007_create_department.sql`, `migrations/0012_add_office_override.sql`
- `models/employee.py` (ORM model declares `office_id` as optional FK)
- `services/order_service.py` (constructs `order_line` rows; no separate
  `orders` or `products` table exists in this schema — confirmed by grep
  across `migrations/`)

---

## 1. Effective Schema Inventory (abridged)

| Relation | Business purpose | PK | Notes |
|---|---|---|---|
| `country` | Reference/lookup | `country_id` | — |
| `city` | Reference/lookup | `city_id` | FK to `country` |
| `office` | Entity | `office_id` | FK to `city` |
| `department` | Entity | `department_id` | FK to `office`; FK to `employee` (manager) — **cycle candidate** |
| `employee` | Entity | `employee_id` | FK to `department`; optional FK to `office` — **diamond candidate** |
| `order_line` | Associative/transaction | `(order_id, product_id)` | Composite key — **2NF candidate** |

---

## 2. Candidate Keys and Superkeys

- `order_line`: declared PK `(order_id, product_id)`. No other attribute or
  combination functionally determines the full row (an order can contain
  many products; a product appears on many orders), so this composite pair
  is the only candidate key. **Confirmed** — enforced by the PK constraint
  itself.
- All other relations: single-attribute surrogate PKs. No natural candidate
  key is enforced anywhere (e.g. no unique constraint on
  `department_name`, no unique constraint on `(city_id, floor)` for office).
  **Flag:** if the business rule is "no two departments share a name," this
  is an **unenforced natural candidate key** — Strongly Inferred from naming
  convention, not Confirmed.

---

## 3. Functional Dependencies (F)

```
order_id, product_id -> quantity            (full, key-determined)
order_id             -> order_date          (PARTIAL)
product_id           -> product_name        (PARTIAL)
product_id           -> product_price       (PARTIAL)

employee_id  -> department_id               (full)
employee_id  -> office_id                   (full, nullable override)
department_id -> office_id                  (full)
department_id -> manager_id                 (full, nullable)
manager_id   -> department_id               (full, since manager_id
                                              references employee.employee_id,
                                              and every employee has exactly
                                              one department_id)

office_id  -> city_id                       (full)
city_id    -> country_id                    (full)
city_id    -> city_name                     (full)
country_id -> country_name                  (full)
```

Evidence classification:
- `order_id -> order_date` and `product_id -> product_name/price`:
  **Confirmed** — these attributes are stored redundantly per row with no
  mechanism preventing divergence; business logic in `order_service.py`
  reads `product_name` directly off `order_line` rather than joining, which
  confirms the dependency is real and currently unenforced across rows.
- `manager_id -> department_id`: **Strongly Inferred** — follows from
  `employee_id -> department_id` plus the assumption that a manager is
  drawn from the department's own employees. Not Confirmed because no
  constraint enforces "a department's manager must belong to that
  department" — this should be flagged as a missing check.

---

## 4. Armstrong's Axiom Derivation (Deep Transitive Chain)

Given:
```
employee_id   -> department_id
department_id -> office_id
office_id     -> city_id
city_id       -> country_id
```

By transitivity (applied three times)://
```
employee_id -> office_id        (from employee_id -> department_id -> office_id)
employee_id -> city_id          (extending through office_id -> city_id)
employee_id -> country_id       (extending through city_id -> country_id)
```

By augmentation, attaching `employee_id` itself (reflexivity: `{employee_id}
⊆ {employee_id}`) and unioning with the above:
```
employee_id -> {department_id, office_id, city_id, country_id}
```

**Attribute closure:**
```
{employee_id}+ under F = {employee_id, department_id, office_id, city_id,
                           country_id, department_name (via department_id),
                           manager_id (via department_id), city_name,
                           country_name}
```
Since `{employee_id}+` does not include every attribute of every relation
(it can't reach `employee_name`, which is not functionally derived — it's
an independent fact of the `employee` relation, correctly so), this closure
is used only to confirm `employee_id` is a key of `employee` and to trace
the deep transitive chain, not to imply `employee_id` is a key of `city` or
`country`.

**Deep transitive dependency chain identified:**
`employee_id -> department_id -> office_id -> city_id -> country_id`

Root determinant: `employee_id` (candidate key of `employee`, so not itself
a 3NF violation at that relation). But note the chain passes *through*
`department_id`, `office_id`, and `city_id` — each of which is a
non-prime attribute of a *different* relation than the one it determines
the next link in. This is normal (it's how foreign keys should work) as
long as each individual relation is separately in 3NF. The danger case
would be if all five attributes were flattened into a single
`employee_full_location` table — then `employee_id -> country_id` would
be a genuine transitive 3NF violation within that one relation.

---

## 5. Minimal Cover (for `order_line`)

Starting set:
```
{order_id, product_id} -> quantity
order_id               -> order_date
product_id             -> product_name
product_id             -> product_price
```

Right-hand sides are already singleton (no decomposition needed).
Left-side extraneity check: is `product_id` extraneous in
`{order_id, product_id} -> quantity`? Compute `{order_id}+` using only the
remaining dependencies — `{order_id}+ = {order_id, order_date}`, which does
NOT include `quantity`. So `product_id` is NOT extraneous. Same check
confirms `order_id` is not extraneous either. The set above is already a
minimal cover.

---

## 6. 1NF Analysis

No repeating groups, comma-separated values, or hidden multi-valued
columns detected in this schema. All attributes are atomic. **1NF: satisfied
across all six relations.**

---

## 7. 2NF Analysis — Violation Found

`order_line` has composite candidate key `(order_id, product_id)`.

Proper subsets and their closures:
- `{order_id}+ = {order_id, order_date}` → determines `order_date`
- `{product_id}+ = {product_id, product_name, product_price}` → determines
  `product_name`, `product_price`

Both `order_date` (depends only on `order_id`) and `product_name`,
`product_price` (depend only on `product_id`) are **non-prime attributes
depending on a proper subset of the candidate key** — classic partial
dependencies.

**Finding: DB-DESIGN-001**
- Severity: Medium
- Confidence: Confirmed
- Relation: `order_line`
- Dependency: `order_id -> order_date`, `product_id -> product_name,
  product_price`
- Structure: Partial
- Anomaly risk:
  - *Insertion*: cannot record a new product's name/price without an order
    referencing it.
  - *Update*: changing a product's price requires updating every
    `order_line` row containing that product; missing even one row leaves
    inconsistent prices for the same product.
  - *Deletion*: deleting the last order containing a given product erases
    that product's name and price from the database entirely.
- Recommendation: decompose into `order(order_id, order_date)`,
  `product(product_id, product_name, product_price)`, and
  `order_line(order_id, product_id, quantity)`.

---

## 8. 3NF Analysis

Checked every non-trivial dependency against "X is a superkey OR A is
prime." All dependencies in `department`, `office`, `city`, `country`, and
`employee` satisfy this (each non-key attribute is directly determined by
that relation's own key, with no non-key attribute determining another
non-key attribute within the same relation). **3NF: satisfied**, except for
the `order_line` violations already reported in Section 7 (a 2NF violation
is necessarily also a 3NF violation).

---

## 9. Diamond Dependency Analysis — Conflict Found

```
        employee_id
         /        \
department_id   office_id (direct, nullable)
         \        /
        office_id (via department)
```

Two paths from `employee_id` to a resolved office:
1. `employee_id -> department_id -> office_id` (indirect, via department)
2. `employee_id -> office_id` (direct column on `employee`, nullable)

**Classification: Conflicting.**

Business rule reconstructed from code (Strongly Inferred, from
`models/employee.py` comment "office_id: personal override, falls back to
department office"): an employee's effective office is
`employee.office_id IF NOT NULL ELSE employee.department.office_id`. This
is a legitimate business rule (override pattern), not an accident — but it
means the two paths **can** disagree by design, and nothing in the schema
enforces that the direct `office_id`, when set, refers to a real office
distinct from the department's own office in a *consistent* way (e.g.
nothing stops setting it to a nonsensical office in another country).

**Finding: DB-DESIGN-002**
- Severity: Low (Informational leaning, since divergence is intentional)
- Confidence: Confirmed (business rule) / Suspected (whether divergence is
  ever validated)
- Structure: Diamond, Conflicting-by-design
- Security impact: none directly, but if downstream authorization or
  reporting logic ever joins through `department_id -> office_id` without
  checking for the override, it will silently produce wrong results for
  any employee with a personal office override. This should be flagged to
  whoever writes office-based reporting queries.
- Recommendation: no schema change required if the override is intentional,
  but add a comment/constraint documenting precedence, and audit all
  queries that resolve "employee's office" to confirm they apply the
  override correctly rather than always joining through department.

---

## 10. Dependency Cycle Analysis — Cycle Found

```
department_id -> manager_id -> department_id
```

`department.manager_id` references `employee.employee_id`, and
`employee.department_id` references `department.department_id`. Following
the FD chain: `department_id -> manager_id` (Section 3) and
`manager_id -> department_id` (Section 3, Strongly Inferred) forms a
two-node cycle at the table level:

```
department -> employee (manager_id FK)
employee   -> department (department_id FK)
```

**Analysis:**
- This is a common and usually legitimate pattern (a department "has" a
  manager who is also "an employee of" some department), not an error by
  itself.
- It does require a **nullable FK** (`department.manager_id`) to break the
  insertion-order deadlock: you cannot insert a department with a manager
  before that manager exists as an employee, and you cannot insert an
  employee's department before the department exists. `manager_id` being
  nullable is the correct workaround — **Confirmed** as already implemented
  correctly in the schema.
- **Open question (Unknown, needs business-rule confirmation):** is it
  valid for `department.manager_id` to reference an employee in a
  *different* department than the one being managed? If not, this is an
  unenforced invariant (`department.manager_id`'s `employee.department_id`
  must equal `department.department_id`) — a self-referential consistency
  rule that no CHECK constraint currently captures (correlated subqueries
  aren't expressible in a simple CHECK; would need a trigger).

**Finding: DB-DESIGN-003**
- Severity: Medium
- Confidence: Confirmed (cycle exists) / Unknown (whether cross-department
  managers are valid)
- Recommendation: confirm the business rule; if managers must belong to
  the department they manage, add a trigger to enforce it, since the
  foreign keys alone cannot express this.

---

## 11. Lossless Join Verification (for the Section 7 decomposition)

Decomposing `order_line(order_id, product_id, quantity, order_date,
product_name, product_price)` into:
- `R1 = order(order_id, order_date)`
- `R2 = product(product_id, product_name, product_price)`
- `R3 = order_line(order_id, product_id, quantity)`

Check pairwise. For `R1` and `R3`: `R1 ∩ R3 = {order_id}`, and
`order_id -> order_date` (all of `R1`) holds in `F+`, so
`R1 ∩ R3 -> R1` — **lossless** by the standard binary-decomposition test.
Same reasoning applies to `R2`/`R3` via `product_id -> product_name,
product_price`. Composing the two binary decompositions preserves
losslessness transitively. **Lossless: verified.**

---

## 12. Dependency Preservation Verification

Projecting `F` onto the decomposition:
- `R1` carries `order_id -> order_date` ✓.
- `R2` carries `product_id -> product_name, product_price` ✓.
- `R3` carries `{order_id, product_id} -> quantity` ✓ (trivially, as the key).

Every dependency in the original `F` is fully contained within a single
relation of the decomposition — none require a join to re-derive.
**Dependency preservation: verified, no triggers or cross-table
enforcement needed for this particular decomposition.**

---

## 13. Anomaly Summary (tie-back to concrete rows)

Using the *original* undecomposed `order_line` table as the subject:

- **Insertion anomaly**: a new product cannot be entered into the system
  (name, price) until it appears on at least one order — there is no
  independent `product` table to insert into first.
- **Update anomaly**: if `product_price` changes for a product that
  appears on 40 existing order rows, all 40 rows must be updated in the
  same transaction or the price becomes inconsistent depending on which
  order a report happens to read.
- **Deletion anomaly**: deleting the sole order containing a rarely-ordered
  product silently deletes all record of that product's name and price.

All three anomalies are resolved by the Section 7/11/12 decomposition.

---

## Takeaways for calibrating output depth

- Not every relation needs this much prose — `country`, `city`, and
  `office` were fine and got a one-line pass in Section 8 rather than a
  full section each. Depth should scale with where the actual findings are.
- The diamond in Section 9 was *not* automatically bad — the classification
  step (Conflicting vs Benign vs Redundant) is what makes the finding
  useful instead of alarmist.
- The cycle in Section 10 similarly turned out to be a legitimate pattern
  with one specific open question, not a structural flaw — resist the urge
  to treat "cycle detected" as inherently a bug.
- Every numeric/structural claim above (closures, minimal cover, lossless
  join proof) is shown with its reasoning step, not just asserted — that
  work is what separates this from a shallow "looks normalized" response.