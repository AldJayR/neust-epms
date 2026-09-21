# NEUST-EPMS Database Schema

> Auto-generated from Drizzle ORM schema files.

## Tables Overview

| Table | Description |
|-------|-------------|
| `users` | System users (faculty, staff, admins) |
| `roles` | User roles (e.g., Admin, Reviewer, Faculty) |
| `campuses` | NEUST campus locations |
| `departments` | Academic departments |
| `proposals` | Extension project proposals |
| `projects` | Approved proposals (1:1 with proposals) |
| `moas` | Memorandum of Agreements with partners |
| `partners` | External partner organizations |
| `sdgs` | UN Sustainable Development Goals (17 goals) |
| `beneficiary_sectors` | Target beneficiary categories |
| `extension_services` | Types of extension services |
| `banner_programs` | Banner programs per campus/department |
| `proposal_members` | Team members assigned to proposals |
| `proposal_documents` | Versioned proposal document uploads |
| `proposal_comments` | PDF annotation comments on documents |
| `proposal_beneficiaries` | Junction: proposals ↔ beneficiary sectors |
| `proposal_sdgs` | Junction: proposals ↔ SDGs |
| `proposal_departments` | Junction: proposals ↔ collaborating departments |
| `proposal_extension_services` | Junction: proposals ↔ extension services |
| `proposal_reviews` | Endorsement/approval review decisions |
| `project_reports` | Submitted project reports |
| `project_reporting_milestones` | Reporting deadlines for projects |
| `special_orders` | Faculty deloading special orders (linked to members) |
| `notifications` | User notifications |
| `audit_logs` | System audit trail |
| `system_settings` | Key-value system configuration |
| `password_reset_tokens` | Password reset token storage |
| `cronlocks` | Cron job distributed locks |

---

## Core Tables

### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | UUID | PK, default random |
| `role_id` | INTEGER | NOT NULL, FK → `roles.role_id` |
| `campus_id` | INTEGER | NOT NULL, FK → `campuses.campus_id` |
| `department_id` | INTEGER | FK → `departments.department_id` |
| `first_name` | VARCHAR(100) | NOT NULL |
| `middle_name` | VARCHAR(100) | |
| `last_name` | VARCHAR(100) | NOT NULL |
| `name_suffix` | VARCHAR(20) | |
| `academic_rank` | VARCHAR(100) | |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `avatar_url` | TEXT | |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `has_completed_onboarding` | BOOLEAN | NOT NULL, default false |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `archived_at` | TIMESTAMPTZ | |

**Indexes:** `role_id`, `campus_id`, `department_id`

---

### `roles`

| Column | Type | Constraints |
|--------|------|-------------|
| `role_id` | SERIAL | PK |
| `role_name` | VARCHAR(50) | NOT NULL, UNIQUE |

---

### `campuses`

| Column | Type | Constraints |
|--------|------|-------------|
| `campus_id` | SERIAL | PK |
| `campus_name` | VARCHAR(255) | NOT NULL, UNIQUE |
| `is_main_campus` | BOOLEAN | NOT NULL, default false |

---

### `departments`

| Column | Type | Constraints |
|--------|------|-------------|
| `department_id` | SERIAL | PK |
| `department_code` | VARCHAR(50) | NOT NULL, UNIQUE |
| `department_name` | VARCHAR(255) | NOT NULL, UNIQUE |

---

## Proposal System

### `proposals`

| Column | Type | Constraints |
|--------|------|-------------|
| `proposal_id` | UUID | PK, default random |
| `campus_id` | INTEGER | NOT NULL, FK → `campuses.campus_id` |
| `department_id` | INTEGER | NOT NULL, FK → `departments.department_id` |
| `title` | VARCHAR(500) | NOT NULL |
| `banner_program_id` | INTEGER | FK → `banner_programs.banner_program_id` |
| `banner_program` | VARCHAR(255) | |
| `project_locale` | VARCHAR(255) | NOT NULL |
| `budget_partner` | NUMERIC(14,2) | default '0' |
| `budget_neust` | NUMERIC(14,2) | default '0' |
| `status` | VARCHAR(50) | NOT NULL, default 'Pending Review' |
| `bypassed_ret_chair` | BOOLEAN | NOT NULL, default false |
| `revision_num` | INTEGER | NOT NULL, default 0 |
| `institutional_approval_doc_path` | VARCHAR(500) | |
| `institutional_approval_hash` | VARCHAR(64) | |
| `institutional_approved_at` | TIMESTAMPTZ | |
| `target_start_date` | TIMESTAMPTZ | |
| `target_end_date` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `archived_at` | TIMESTAMPTZ | |

**Indexes:**
- `campus_id`
- `department_id`
- `banner_program_id`
- `active_department_created_idx` — filtered by `archived_at IS NULL`
- `active_campus_created_idx` — filtered by `archived_at IS NULL`
- `status`

**Check:** `target_start_date < target_end_date` (when both are not null)

---

### `projects`

| Column | Type | Constraints |
|--------|------|-------------|
| `project_id` | UUID | PK, default random |
| `proposal_id` | UUID | NOT NULL, UNIQUE, FK → `proposals.proposal_id` |
| `moa_id` | UUID | FK → `moas.moa_id` |
| `actual_end_date` | TIMESTAMPTZ | |
| `project_status` | VARCHAR(50) | NOT NULL, default 'Approved' |
| `on_hold` | BOOLEAN | NOT NULL, default false |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `archived_at` | TIMESTAMPTZ | |

**Indexes:**
- `moa_id`
- `active_status_created_idx` — filtered by `archived_at IS NULL`

**Constraint:** 1:1 with proposals (unique on `proposal_id`)

---

### `moas`

| Column | Type | Constraints |
|--------|------|-------------|
| `moa_id` | UUID | PK, default random |
| `partner_id` | UUID | NOT NULL, FK → `partners.partner_id` |
| `storage_path` | VARCHAR(500) | |
| `content_hash` | VARCHAR(64) | |
| `uploaded_by` | UUID | FK → `users.user_id` |
| `source_ip` | VARCHAR(45) | |
| `valid_from` | TIMESTAMPTZ | NOT NULL |
| `valid_until` | TIMESTAMPTZ | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `archived_at` | TIMESTAMPTZ | |

**Indexes:** `partner_id`, `active_idx` (filtered by `archived_at IS NULL`)
**Check:** `valid_from < valid_until` (when both are not null)

---

### `partners`

| Column | Type | Constraints |
|--------|------|-------------|
| `partner_id` | UUID | PK, default random |
| `partner_name` | VARCHAR(255) | NOT NULL |
| `partner_type` | VARCHAR(100) | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

---

## Proposal Junction Tables

### `proposal_members`

| Column | Type | Constraints |
|--------|------|-------------|
| `member_id` | UUID | PK, default random |
| `proposal_id` | UUID | NOT NULL, FK → `proposals.proposal_id` |
| `user_id` | UUID | NOT NULL, FK → `users.user_id` |
| `project_role` | VARCHAR(100) | NOT NULL |
| `added_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `archived_at` | TIMESTAMPTZ | |

**Indexes:** `proposal_id`, `user_id`, `active_proposal_id_idx` (filtered)
**Constraints:**
- UNIQUE(`proposal_id`, `user_id`)
- UNIQUE `pm_one_active_project_leader_unique` — one active Project Leader per proposal

---

### `proposal_departments`

| Column | Type | Constraints |
|--------|------|-------------|
| `proposal_id` | UUID | NOT NULL, FK → `proposals.proposal_id` |
| `department_id` | INTEGER | NOT NULL, FK → `departments.department_id` |
| `added_at` | TIMESTAMPTZ | NOT NULL, default now() |

**PK:** (`proposal_id`, `department_id`)

---

### `proposal_beneficiaries`

| Column | Type | Constraints |
|--------|------|-------------|
| `proposal_id` | UUID | NOT NULL, FK → `proposals.proposal_id` |
| `sector_id` | INTEGER | NOT NULL, FK → `beneficiary_sectors.sector_id` |
| `archived_at` | TIMESTAMPTZ | |

**PK:** (`proposal_id`, `sector_id`)
**Indexes:** `proposal_id`, `sector_id`, `active_proposal_id_idx` (filtered)

---

### `proposal_sdgs`

| Column | Type | Constraints |
|--------|------|-------------|
| `proposal_id` | UUID | NOT NULL, FK → `proposals.proposal_id` |
| `sdg_id` | INTEGER | NOT NULL, FK → `sdgs.sdg_id` |

**PK:** (`proposal_id`, `sdg_id`)

---

### `proposal_extension_services`

| Column | Type | Constraints |
|--------|------|-------------|
| `proposal_id` | UUID | NOT NULL, FK → `proposals.proposal_id` |
| `extension_service_id` | INTEGER | NOT NULL, FK → `extension_services.extension_service_id` |
| `archived_at` | TIMESTAMPTZ | |

**PK:** (`proposal_id`, `extension_service_id`)
**Indexes:** `proposal_id`, `extension_service_id`, `active_proposal_id_idx` (filtered)

---

### `proposal_documents`

| Column | Type | Constraints |
|--------|------|-------------|
| `document_id` | UUID | PK, default random |
| `proposal_id` | UUID | NOT NULL, FK → `proposals.proposal_id` |
| `storage_path` | VARCHAR(500) | NOT NULL |
| `version_num` | INTEGER | NOT NULL |
| `content_hash` | VARCHAR(64) | |
| `uploaded_by` | UUID | FK → `users.user_id` |
| `source_ip` | VARCHAR(45) | |
| `uploaded_at` | TIMESTAMPTZ | NOT NULL, default now() |

**Constraints:** UNIQUE(`proposal_id`, `version_num`)

---

### `proposal_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| `comment_id` | UUID | PK, default random |
| `document_id` | UUID | NOT NULL, FK → `proposal_documents.document_id` |
| `user_id` | UUID | NOT NULL, FK → `users.user_id` |
| `content` | TEXT | NOT NULL |
| `annotation_json` | JSONB | (x, y, width, height, page) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

**AnnotationData type:**
```typescript
{ x: number; y: number; width: number; height: number; page: number }
```

---

### `proposal_reviews`

| Column | Type | Constraints |
|--------|------|-------------|
| `review_id` | UUID | PK, default random |
| `proposal_id` | UUID | NOT NULL, FK → `proposals.proposal_id` |
| `reviewer_id` | UUID | NOT NULL, FK → `users.user_id` |
| `review_stage` | VARCHAR(50) | NOT NULL |
| `decision` | VARCHAR(50) | NOT NULL |
| `comments` | TEXT | |
| `reviewed_at` | TIMESTAMPTZ | NOT NULL, default now() |

---

## Reference Tables

### `sdgs`

| Column | Type | Constraints |
|--------|------|-------------|
| `sdg_id` | SERIAL | PK |
| `sdg_number` | INTEGER | NOT NULL, UNIQUE |
| `sdg_title` | VARCHAR(255) | NOT NULL |

---

### `beneficiary_sectors`

| Column | Type | Constraints |
|--------|------|-------------|
| `sector_id` | SERIAL | PK |
| `sector_name` | VARCHAR(255) | NOT NULL, UNIQUE |

---

### `extension_services`

| Column | Type | Constraints |
|--------|------|-------------|
| `extension_service_id` | SERIAL | PK |
| `service_name` | VARCHAR(100) | NOT NULL, UNIQUE |

---

### `banner_programs`

| Column | Type | Constraints |
|--------|------|-------------|
| `banner_program_id` | SERIAL | PK |
| `campus_id` | INTEGER | NOT NULL, FK → `campuses.campus_id` |
| `department_id` | INTEGER | FK → `departments.department_id` |
| `program_name` | VARCHAR(255) | NOT NULL |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |

**Unique Index:** (`campus_id`, `coalesce(department_id, 0)`, `lower(program_name)`)

---

## Project Reporting

### `project_reporting_milestones`

| Column | Type | Constraints |
|--------|------|-------------|
| `milestone_id` | UUID | PK, default random |
| `project_id` | UUID | NOT NULL, FK → `projects.project_id` |
| `report_type` | VARCHAR(100) | NOT NULL |
| `due_at` | TIMESTAMPTZ | NOT NULL |
| `completed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

**Constraints:**
- UNIQUE(`milestone_id`, `project_id`)
- UNIQUE(`project_id`, `report_type`, `due_at`)

---

### `project_reports`

| Column | Type | Constraints |
|--------|------|-------------|
| `report_id` | UUID | PK, default random |
| `project_id` | UUID | NOT NULL, FK → `projects.project_id` |
| `milestone_id` | UUID | NOT NULL, FK → `project_reporting_milestones.milestone_id` |
| `submitted_by_id` | UUID | NOT NULL, FK → `users.user_id` |
| `report_type` | VARCHAR(100) | NOT NULL |
| `storage_path` | VARCHAR(500) | |
| `content_hash` | VARCHAR(64) | |
| `uploaded_by` | UUID | FK → `users.user_id` |
| `source_ip` | VARCHAR(45) | |
| `remarks` | TEXT | |
| `submitted_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `archived_at` | TIMESTAMPTZ | |

**Constraints:**
- FK: (`milestone_id`, `project_id`) → `project_reporting_milestones`
- Unique index: (`milestone_id`, `report_type`) filtered by `archived_at IS NULL`

---

### `special_orders`

| Column | Type | Constraints |
|--------|------|-------------|
| `special_order_id` | UUID | PK, default random |
| `member_id` | UUID | NOT NULL, FK → `proposal_members.member_id` |
| `so_number` | VARCHAR(100) | NOT NULL, UNIQUE |
| `storage_path` | VARCHAR(500) | |
| `content_hash` | VARCHAR(64) | |
| `uploaded_by` | UUID | FK → `users.user_id` |
| `source_ip` | VARCHAR(45) | |
| `date_issued` | TIMESTAMPTZ | |
| `status` | VARCHAR(50) | NOT NULL, default 'Pending' |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `archived_at` | TIMESTAMPTZ | |

**Constraint:** One active (non-archived) special order per member

---

## System Tables

### `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| `notification_id` | UUID | PK, default random |
| `recipient_id` | UUID | NOT NULL, FK → `users.user_id` |
| `type` | TEXT | NOT NULL |
| `dedupe_key` | TEXT | UNIQUE |
| `title` | TEXT | NOT NULL |
| `message` | TEXT | NOT NULL |
| `is_read` | BOOLEAN | NOT NULL, default false |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `read_at` | TIMESTAMPTZ | |

**Indexes:** `recipient_id`, `recipient_created`, `unread_recipient` (filtered)

---

### `audit_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| `log_id` | UUID | PK, default random |
| `user_id` | UUID | NOT NULL, FK → `users.user_id` |
| `action` | VARCHAR(255) | NOT NULL |
| `table_affected` | VARCHAR(100) | NOT NULL |
| `old_value` | JSONB | |
| `new_value` | JSONB | |
| `ip_address` | VARCHAR(45) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

---

### `system_settings`

| Column | Type | Constraints |
|--------|------|-------------|
| `setting_key` | VARCHAR(100) | PK |
| `setting_value` | TEXT | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |

---

### `password_reset_tokens`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default random |
| `user_id` | UUID | NOT NULL, FK → `users.user_id` |
| `token_hash` | TEXT | NOT NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `used_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

**Indexes:** `user_id`, `token_hash`, `expires_at`, `active_token` (filtered)

---

### `cron_locks`

| Column | Type | Constraints |
|--------|------|-------------|
| `job_name` | TEXT | PK |
| `lock_token` | UUID | NOT NULL |
| `locked_until` | TIMESTAMPTZ | NOT NULL |

---

## Entity Relationships

```
roles ──────────< users >────────── campuses
                      │
                      ├── departments (optional)
                      │
                      ├── proposal_members ──── proposals
                      │                              │
                      │                              ├── proposal_departments ─── departments
                      │                              ├── proposal_beneficiaries ── beneficiary_sectors
                      │                              ├── proposal_sdgs ─────────── sdgs
                      │                              ├── proposal_extension_services ── extension_services
                      │                              ├── proposal_documents ──── proposal_comments
                      │                              ├── proposal_reviews
                      │                              └── banner_programs (optional)
                      │
                      └── special_orders (via proposal_members)
                           │
projects (1:1) ────────────┘
    │
    ├── moas ──── partners
    │
    ├── project_reports ──── project_reporting_milestones
    │
    └── notifications
```

## Soft Delete Pattern

Tables using `archived_at` for soft deletion:
- `users`, `proposals`, `projects`, `moas`
- `proposal_members`, `proposal_beneficiaries`, `proposal_extension_services`
- `project_reports`, `special_orders`

Filtered indexes with `WHERE archived_at IS NULL` are used for active-record queries.
