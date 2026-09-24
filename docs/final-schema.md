# NEUST-EPMS Logical Schema with Crow's Foot Cardinalities

### **Notation**
* **PK:** Primary Key
* **AK:** Alternate / Candidate Key (Active Uniqueness)
* **FK:** Foreign Key
* **NN:** Not Null
* **Symbols:**
  * `||` : Mandatory One ($1..1$)
  * `O|` : Optional One ($0..1$)
  * `>|` : Mandatory Many ($1..*$)
  * `>O` : Optional Many ($0..*$)

---

# **SYSTEM BUSINESS RULES**

### **1. Campus Organization & Scoping Rules**
* **BR-01 (Campus Structure Duality):** Main campuses (Sumacab and General Tinio Street / GTS) operate with distinct academic departments/colleges (e.g., CICT, COE, CoEd). Branch campuses (Gabaldon, Talavera, San Isidro, Atate, etc.) operate as unified campus units without independent departmental subdivisions.
* **BR-02 (Banner Program Ownership & Scoping):** Every Banner Program is an umbrella extension agenda scoped to a specific implementing unit using a composite `unit_scope`:
  * Main campus departmental programs use the composite prefix `SUM-{DEPT}` or `GTS-{DEPT}` (e.g., `'SUM-CICT'`, `'SUM-COE'`, `'GTS-COED'`).
  * Branch campuses use the campus prefix (e.g., `'GAB'`, `'TAL'`).
  * To prevent circular foreign key loops on the ERD, `banner_programs` is modeled as a Reference Catalog without direct foreign key lines to `campuses` or `departments`. Scoping is strictly enforced via `unit_scope`.
* **BR-03 (RET Chair Program Administration):** An RET Chair or Coordinator may only create and manage Banner Programs matching their assigned unit scope (`current_user.department_code` for main campuses; `current_user.campus_code` for branch campuses).
* **BR-04 (Proposal Banner Program Visibility):** When a proponent initiates a project proposal, the Banner Program dropdown is filtered to match the target implementing unit:
  * For local proposals, the dropdown queries `WHERE unit_scope = current_user.department_code` (or campus code).
  * This prevents branch campus faculty (e.g., Gabaldon IT faculty) from seeing or selecting main campus programs (e.g., Sumacab CICT).
* **BR-05 (Cross-Campus Project Deployment):** A faculty member stationed at a main campus (e.g., Sumacab) may initiate and lead an extension project targeted for an off-campus (e.g., Talavera). In this case, the proponent selects the target campus's banner program (`unit_scope = 'TAL'`). The faculty's home station (`users.campus_id = Sumacab`) remains distinct from the project's implementing banner program.

---

### **2. Proposal Lifecycle & Endorsement Rules**
* **BR-06 (Mandatory Banner Program Anchor):** Every proposal must anchor to exactly one active Banner Program (`proposals.banner_program_id [NN]`). Standalone or unclassified proposals are prohibited.
* **BR-07 (Derived Lead & Collaborating Units):** Proposals do not store redundant `campus_id` or `department_id` columns. The project's institutional affiliation is derived from its mandatory `banner_program_id`. Collaborating departments are derived directly from the team roster (`proposal_members → users → departments`).
* **BR-08 (Mandatory Single Project Leader):** Every proposal must have exactly one active member with the role `'Project Leader'` (`proposal_members.project_role = 'Project Leader'`). Additional members may be assigned as Assistant Project Leaders or Project Staff.
* **BR-09 (Universal Chair Endorsement — No Bypass):** All proposals must undergo RET Chair endorsement. Even if the proposal is submitted by an RET Chair, the Chair must endorse their own proposal through the system.
* **BR-10 (Verified Dean/Director Endorsement Form):** For a proposal to be endorsed by the RET Chair, the Chair must upload a scanned physical endorsement form signed by the College Dean (for main campuses) or Campus Director (for branch campuses). Stored via `endorsement_doc_path` and `endorsement_doc_hash`.
* **BR-11 (Director Institutional Approval):** The University Extension Director reviews the proposal and the verified Dean/Director endorsement form. Upon approval, the Director uploads the final scanned approval document signed by university executive leadership (`institutional_approval_doc_path`).

---

### **3. Project Implementation & Reporting Rules**
* **BR-12 (Project Activation Prerequisite):** A proposal may only mature into an active `project` record once it reaches `'Approved'` status with a valid institutional approval scan. If the project involves an external community partner, an active, verified partner MOA (`moa_id`) must be linked.
* **BR-13 (Mandatory Reporting Milestones):** Every active project must have scheduled reporting milestones (`project_reporting_milestones`) established at activation on a monthly cadence starting 1 month post-activation concluding with Terminal Report.
* **BR-14 (Consolidated Terminal Report Submission):** When fulfilling a Terminal Report milestone, the project leader must submit the unified **`Accomplishment and Terminal Report`** as the primary report file (`project_reports`).
* **BR-15 (Closure Supporting Documents):** The `Accomplishment and Terminal Report` must be accompanied by participant **`Evaluation Forms`** (mandatory) and **`Attendance Records`** (optional sign-in sheets), stored in `report_attachments`.
* **BR-16 (Director Final Closure Approval):** Submission of closure reports transitions the project status to `'Pending Closure'`. The project is only marked `'Closed'` once the Extension Director signs off on the closure decision.

---

### **4. Diagramming & Normalization Integrity Rules**
* **BR-17 (Zero Loop Diagram Constraint):** To prevent circular dependency flags during defense, the following relationship lines are omitted from the physical ERD canvas while maintaining foreign key integrity in SQL:
  * `proposal_comments.user_id` is an author attribution stamp; `proposal_comments` is drawn as a leaf dependent entity of `proposal_documents`.
  * `project_reports.submitted_by_id` is an audit attribution stamp; `project_reports` is drawn as a dependent entity of `project_reporting_milestones`.
  * `uploaded_by` in document/MOA/report tables is an audit attribute without an ERD relationship line to `users`.
* **BR-18 (Evaluator vs. Proponent Role Separation):** The relationship between `users` and `proposal_reviews` represents an **Evaluator**, which is semantically distinct from `users` and `proposal_members` (representing a **Proponent**). A check constraint prevents self-review.

---

# **LOGICAL SCHEMA SPECIFICATION**

## 1. Reference Entities & Program Catalogs

### `roles`
* `role_id` : Integer [PK]
* `role_name` : String [NN, AK]
* **Relationships:**
  * `roles` `||` ─── governs / is governed by ─── `>|` `users`

---

### `campuses`
* `campus_id` : Integer [PK]
* `campus_code` : String [NN, AK] *(e.g., `'SUM'`, `'GTS'`, `'GAB'`, `'TAL'`)*
* `campus_name` : String [NN, AK]
* `is_main_campus` : Boolean [NN, Default: false]
* **Relationships:**
  * `campuses` `||` ─── stations / home station of ─── `>|` `users`
    *(Faculty Employment Station / Home Campus)*

---

### `departments`
* `department_id` : Integer [PK]
* `department_code` : String [NN, AK] *(e.g., `'CICT'`, `'COE'`, `'COED'`)*
* `department_name` : String [NN, AK]
* **Relationships:**
  * `departments` `O|` ─── houses / is housed in ─── `>|` `users`
    *(Optional: Central administrators and branch campus faculty have no departmental subdivision)*

---

### `banner_programs` *(Reference Entity — Agenda Catalog)*
* `banner_program_id` : Integer [PK]
* `program_code` : String [NN, AK] *(e.g., `'BP-SUM-CICT-01'`, `'BP-GAB-01'`, `'BP-TAL-01'`)*
* `program_name` : String [NN]
* `unit_scope` : String [NN] *(Domain: `'SUM-CICT'`, `'SUM-COE'`, `'GTS-COED'`, `'GAB'`, `'TAL'`)*
* `description` : Text [Nullable]
* `is_active` : Boolean [NN, Default: true]
* `created_at` : Timestamp [NN]
* `updated_at` : Timestamp [NN]
* **Alternate Keys:** `(unit_scope, program_name)` [AK]
* **Relationships:**
  * `banner_programs` `||` ─── frames / is anchored to ─── `>|` `proposals`
    *(Leaf Catalog: Zero outgoing foreign keys to campuses or departments)*

---

### `partners`
* `partner_id` : UUID [PK]
* `partner_name` : String [NN]
* `partner_type` : String [NN]
* `created_at` : Timestamp [NN]
* **Relationships:**
  * `partners` `||` ─── enters into / signed with ─── `>O` `moas`

---

### `sdgs`
* `sdg_id` : Integer [PK]
* `sdg_number` : SmallInt [NN, AK, Range: 1–17]
* `sdg_title` : String [NN]
* **Relationships:**
  * `sdgs` `||` ─── addressed by / addresses ─── `>O` `proposal_sdgs`

---

### `beneficiary_sectors`
* `sector_id` : Integer [PK]
* `sector_name` : String [NN, AK]
* **Relationships:**
  * `beneficiary_sectors` `||` ─── targeted by / targets ─── `>O` `proposal_beneficiaries`

---

### `extension_services`
* `extension_service_id` : Integer [PK]
* `service_name` : String [NN, AK]
* **Relationships:**
  * `extension_services` `||` ─── provided through / provides ─── `>O` `proposal_extension_services`

---

## 2. Core Entities & Users

### `users`
* `user_id` : UUID [PK]
* `role_id` : Integer [NN, FK $\to$ `roles.role_id`]
* `campus_id` : Integer [NN, FK $\to$ `campuses.campus_id`]
* `department_id` : Integer [Nullable, FK $\to$ `departments.department_id`]
* `first_name` : String [NN]
* `middle_name` : String [Nullable]
* `last_name` : String [NN]
* `name_suffix` : String [Nullable]
* `academic_rank` : String [Nullable]
* `email` : String [NN]
* `avatar_url` : String [Nullable]
* `is_active` : Boolean [NN, Default: true]
* `has_completed_onboarding` : Boolean [NN, Default: false]
* `created_at` : Timestamp [NN]
* `updated_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Alternate Keys:** `lower(email)` [AK: where `archived_at IS NULL`]
* **Relationships:**
  * `roles` `||` ─── governs / is governed by ─── `>|` `users`
  * `campuses` `||` ─── stations / home station of ─── `>|` `users`
  * `departments` `O|` ─── houses / is housed in ─── `>|` `users`
  * `users` `||` ─── participates as (Proponent) ─── `>O` `proposal_members`
  * `users` `||` ─── conducts (Evaluator) ─── `>O` `proposal_reviews`
  * `users` `||` ─── receives / alerts ─── `>O` `notifications`
  * `users` `||` ─── initiates / initiated by ─── `>O` `password_reset_tokens`
  * `users` `O|` ─── performs / performed by ─── `>O` `audit_logs`

---

## 3. Proposal System

### `proposals`
* `proposal_id` : UUID [PK]
* `banner_program_id` : Integer [NN, FK $\to$ `banner_programs.banner_program_id`]
* `title` : String [NN]
* `project_locale` : String [NN] *(Specific venue, e.g., 'Brgy. Poblacion, Talavera, Nueva Ecija')*
* `budget_partner` : Decimal(14, 2) [NN, Default: 0, Constraint: $\ge 0$]
* `budget_neust` : Decimal(14, 2) [NN, Default: 0, Constraint: $\ge 0$]
* `status` : String [NN, Default: 'Pending Review']
* `revision_num` : Integer [NN, Default: 0]
* `endorsement_doc_path` : String [Nullable]
* `endorsement_doc_hash` : Char(64) [Nullable]
* `endorsed_at` : Timestamp [Nullable]
* `institutional_approval_doc_path` : String [Nullable]
* `institutional_approval_hash` : Char(64) [Nullable]
* `institutional_approved_at` : Timestamp [Nullable]
* `target_start_date` : Timestamp [Nullable]
* `target_end_date` : Timestamp [Nullable]
* `created_at` : Timestamp [NN]
* `updated_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Integrity Constraint:** `target_start_date < target_end_date`
* **Relationships:**
  * `banner_programs` `||` ─── frames / is anchored to ─── `>|` `proposals`
    *(Mandatory: Inherits target unit scope strictly through banner program)*
  * `proposals` `||` ─── mobilizes / serves in ─── `>|` `proposal_members`
    *(Mandatory: $\ge 1$ member / Project Leader. Collaborating departments derived from members)*
  * `proposals` `||` ─── documents / attaches to ─── `>|` `proposal_documents`
  * `proposals` `||` ─── evaluated by / evaluates ─── `>O` `proposal_reviews`
  * `proposals` `||` ─── advances / is advanced by ─── `>|` `proposal_sdgs`
  * `proposals` `||` ─── targets / is targeted by ─── `>|` `proposal_beneficiaries`
  * `proposals` `||` ─── delivers / is delivered by ─── `>|` `proposal_extension_services`
  * `proposals` `||` ─── matures into / originates from ─── `O|` `projects`

---

### `proposal_members` *(Dependent Entity)*
* `member_id` : UUID [PK]
* `proposal_id` : UUID [NN, FK $\to$ `proposals.proposal_id`]
* `user_id` : UUID [NN, FK $\to$ `users.user_id`]
* `project_role` : String [NN, Domain: `'Project Leader'`, `'Assistant Project Leader'`, `'Project Staff'`]
* `added_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Alternate Keys:**
  * `(proposal_id, user_id)` [AK: Natural Key]
  * `proposal_id` [AK: where `project_role = 'Project Leader'` AND `archived_at IS NULL` (Enforces 1 Leader)]
* **Relationships:**
  * `proposals` `||` ─── mobilizes / serves in ─── `>|` `proposal_members`
  * `users` `||` ─── participates as (Proponent) ─── `>O` `proposal_members`
  * `proposal_members` `||` ─── granted / authorizes ─── `O|` `special_orders`

---

### `proposal_beneficiaries` *(Associative Entity)*
* `proposal_id` : UUID [PK, FK $\to$ `proposals.proposal_id`]
* `sector_id` : Integer [PK, FK $\to$ `beneficiary_sectors.sector_id`]
* `archived_at` : Timestamp [Nullable]
* **Relationships:**
  * `proposals` `||` ─── targets / is targeted by ─── `>|` `proposal_beneficiaries`
  * `beneficiary_sectors` `||` ─── targeted by / targets ─── `>O` `proposal_beneficiaries`

---

### `proposal_sdgs` *(Associative Entity)*
* `proposal_id` : UUID [PK, FK $\to$ `proposals.proposal_id`]
* `sdg_id` : Integer [PK, FK $\to$ `sdgs.sdg_id`]
* **Relationships:**
  * `proposals` `||` ─── advances / is advanced by ─── `>|` `proposal_sdgs`
  * `sdgs` `||` ─── addressed by / addresses ─── `>O` `proposal_sdgs`

---

### `proposal_extension_services` *(Associative Entity)*
* `proposal_id` : UUID [PK, FK $\to$ `proposals.proposal_id`]
* `extension_service_id` : Integer [PK, FK $\to$ `extension_services.extension_service_id`]
* `archived_at` : Timestamp [Nullable]
* **Relationships:**
  * `proposals` `||` ─── delivers / is delivered by ─── `>|` `proposal_extension_services`
  * `extension_services` `||` ─── provided through / provides ─── `>O` `proposal_extension_services`

---

### `proposal_documents` *(Dependent Entity)*
* `document_id` : UUID [PK]
* `proposal_id` : UUID [NN, FK $\to$ `proposals.proposal_id`]
* `storage_path` : String [NN]
* `version_num` : Integer [NN, Constraint: $\ge 1$]
* `content_hash` : Char(64) [Nullable]
* `uploaded_by` : UUID [Nullable, FK $\to$ `users.user_id`] *(Audit attribution stamp)*
* `source_ip` : Inet [Nullable]
* `uploaded_at` : Timestamp [NN]
* **Alternate Keys:** `(proposal_id, version_num)` [AK]
* **Relationships:**
  * `proposals` `||` ─── documents / attaches to ─── `>|` `proposal_documents`
  * `proposal_documents` `||` ─── receives / annotates ─── `>O` `proposal_comments`

---

### `proposal_comments` *(Dependent Entity — Leaf Document Annotation)*
* `comment_id` : UUID [PK]
* `document_id` : UUID [NN, FK $\to$ `proposal_documents.document_id`]
* `user_id` : UUID [NN, FK $\to$ `users.user_id`] *(Author attribution stamp in SQL; no relationship line drawn on ERD canvas)*
* `content` : Text [NN]
* `annotation_json` : JSONB [Nullable, Format: `{ x, y, width, height, page }`]
* `created_at` : Timestamp [NN]
* **Relationships:**
  * `proposal_documents` `||` ─── receives / annotates ─── `>O` `proposal_comments`

---

### `proposal_reviews` *(Dependent Entity)*
* `review_id` : UUID [PK]
* `proposal_id` : UUID [NN, FK $\to$ `proposals.proposal_id`]
* `reviewer_id` : UUID [NN, FK $\to$ `users.user_id`]
* `review_stage` : String [NN, Domain: `'Chair Endorsement'`, `'Director Approval'`]
* `decision` : String [NN, Domain: `'Endorsed'`, `'Approved'`, `'Returned'`, `'Rejected'`]
* `comments` : Text [Nullable]
* `reviewed_at` : Timestamp [NN]
* **Relationships:**
  * `proposals` `||` ─── evaluated by / evaluates ─── `>O` `proposal_reviews`
  * `users` `||` ─── conducts (Evaluator) ─── `>O` `proposal_reviews`

---

## 4. Projects, MOAs & Reporting

### `moas`
* `moa_id` : UUID [PK]
* `partner_id` : UUID [NN, FK $\to$ `partners.partner_id`]
* `storage_path` : String [Nullable]
* `content_hash` : Char(64) [Nullable]
* `uploaded_by` : UUID [Nullable, FK $\to$ `users.user_id`] *(Audit attribution stamp)*
* `source_ip` : Inet [Nullable]
* `valid_from` : Date [NN]
* `valid_until` : Date [NN]
* `created_at` : Timestamp [NN]
* `updated_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Integrity Constraint:** `valid_from < valid_until`
* **Relationships:**
  * `partners` `||` ─── enters into / signed with ─── `>O` `moas`
  * `moas` `O|` ─── authorizes / is governed by ─── `>O` `projects`
    *(Optional: Purely internal projects require no partner MOA)*

---

### `projects`
* `project_id` : UUID [PK]
* `proposal_id` : UUID [NN, FK $\to$ `proposals.proposal_id`]
* `moa_id` : UUID [Nullable, FK $\to$ `moas.moa_id`]
* `actual_end_date` : Timestamp [Nullable]
* `project_status` : String [NN, Default: 'Approved']
* `on_hold` : Boolean [NN, Default: false]
* `created_at` : Timestamp [NN]
* `updated_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Alternate Keys:** `proposal_id` [AK: where `archived_at IS NULL` (1:1 with Active Proposals)]
* **Relationships:**
  * `proposals` `||` ─── matures into / originates from ─── `O|` `projects`
  * `moas` `O|` ─── authorizes / is governed by ─── `>O` `projects`
  * `projects` `||` ─── schedules / scheduled for ─── `>|` `project_reporting_milestones`

---

### `project_reporting_milestones` *(Dependent Entity)*
* `milestone_id` : UUID [PK]
* `project_id` : UUID [NN, FK $\to$ `projects.project_id`]
* `title` : String [NN]
* `milestone_type` : String [NN, Domain: `'Progress'`, `'Midterm'`, `'Closure'`, `'Special'`]
* `due_at` : Timestamp [NN]
* `completed_at` : Timestamp [Nullable]
* `created_at` : Timestamp [NN]
* **Alternate Keys:** `(project_id, title, due_at)` [AK]
* **Relationships:**
  * `projects` `||` ─── schedules / scheduled for ─── `>|` `project_reporting_milestones`
  * `project_reporting_milestones` `||` ─── requires / fulfills ─── `>O` `project_reports`

---

### `project_reports` *(Dependent Entity)*
* `report_id` : UUID [PK]
* `milestone_id` : UUID [NN, FK $\to$ `project_reporting_milestones.milestone_id`]
* `submitted_by_id` : UUID [NN, FK $\to$ `users.user_id`] *(Audit attribution stamp in SQL table; no relationship line drawn on ERD)*
* `report_type` : String [NN, Domain: `'Progress Report'`, `'Accomplishment and Terminal Report'`]
* `storage_path` : String [NN]
* `content_hash` : Char(64) [Nullable]
* `uploaded_by` : UUID [Nullable, FK $\to$ `users.user_id`] *(Audit attribution stamp)*
* `source_ip` : Inet [Nullable]
* `remarks` : Text [Nullable]
* `submitted_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Alternate Keys:** `(milestone_id, report_type)` [AK: where `archived_at IS NULL` (1 active report document per type per milestone)]
* **Relationships:**
  * `project_reporting_milestones` `||` ─── requires / fulfills ─── `>O` `project_reports`
  * `project_reports` `||` ─── accompanied by / attaches to ─── `>O` `report_attachments`

---

### `report_attachments` *(Dependent Entity)*
* `attachment_id` : UUID [PK]
* `report_id` : UUID [NN, FK $\to$ `project_reports.report_id`]
* `attachment_type` : String [NN, Domain: `'Evaluation Forms'`, `'Attendance Records'`, `'Means of Verification'`]
* `storage_path` : String [NN]
* `content_hash` : Char(64) [Nullable]
* `uploaded_by` : UUID [Nullable, FK $\to$ `users.user_id`] *(Audit attribution stamp)*
* `source_ip` : Inet [Nullable]
* `uploaded_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Alternate Keys:** `(report_id, attachment_type)` [AK: where `archived_at IS NULL` AND `attachment_type IN ('Evaluation Forms', 'Attendance Records')`]
* **Relationships:**
  * `project_reports` `||` ─── accompanied by / attaches to ─── `>O` `report_attachments`
    *(Mandatory for closure: Evaluation Forms; Optional: Attendance Records)*

---

### `special_orders` *(Dependent Entity)*
* `special_order_id` : UUID [PK]
* `member_id` : UUID [NN, FK $\to$ `proposal_members.member_id`]
* `so_number` : String [NN]
* `storage_path` : String [Nullable]
* `content_hash` : Char(64) [Nullable]
* `uploaded_by` : UUID [Nullable, FK $\to$ `users.user_id`] *(Audit attribution stamp)*
* `source_ip` : Inet [Nullable]
* `date_issued` : Date [Nullable]
* `status` : String [NN, Default: 'Pending']
* `created_at` : Timestamp [NN]
* `updated_at` : Timestamp [NN]
* `archived_at` : Timestamp [Nullable]
* **Alternate Keys:**
  * `so_number` [AK: where `archived_at IS NULL`]
  * `member_id` [AK: where `archived_at IS NULL`]
* **Relationships:**
  * `proposal_members` `||` ─── granted / authorizes ─── `O|` `special_orders`

---

## 5. System Tables

### `notifications`
* `notification_id` : UUID [PK]
* `recipient_id` : UUID [NN, FK $\to$ `users.user_id`]
* `type` : String [NN]
* `dedupe_key` : Text [Nullable]
* `title` : String [NN]
* `message` : Text [NN]
* `is_read` : Boolean [NN, Default: false]
* `created_at` : Timestamp [NN]
* `read_at` : Timestamp [Nullable]
* **Alternate Keys:** `dedupe_key` [AK: where `dedupe_key IS NOT NULL`]
* **Relationships:**
  * `users` `||` ─── receives / alerts ─── `>O` `notifications`

---

### `audit_logs`
* `log_id` : UUID [PK]
* `user_id` : UUID [Nullable, FK $\to$ `users.user_id`]
* `action` : String [NN]
* `table_affected` : String [NN]
* `record_id` : UUID [Nullable, Direct target row reference]
* `old_value` : JSONB [Nullable]
* `new_value` : JSONB [Nullable]
* `ip_address` : Inet [Nullable]
* `created_at` : Timestamp [NN]
* **Relationships:**
  * `users` `O|` ─── performs / performed by ─── `>O` `audit_logs`

---

### `password_reset_tokens`
* `id` : UUID [PK]
* `user_id` : UUID [NN, FK $\to$ `users.user_id`]
* `token_hash` : Char(64) [NN]
* `expires_at` : Timestamp [NN]
* `used_at` : Timestamp [Nullable]
* `created_at` : Timestamp [NN]
* **Alternate Keys:** `token_hash` [AK: where `used_at IS NULL`]
* **Relationships:**
  * `users` `||` ─── initiates / initiated by ─── `>O` `password_reset_tokens`

---

### `system_settings` *(Standalone)*
* `setting_key` : String [PK]
* `setting_value` : Text [Nullable]
* `updated_at` : Timestamp [NN]

---

### `cron_locks` *(Standalone)*
* `job_name` : String [PK]
* `lock_token` : UUID [NN]
* `locked_until` : Timestamp [NN]