────────────────────────
**SOFTWARE REQUIREMENTS SPECIFICATION (SRS)**
**Compliant with ISO/IEC/IEEE 29148:2018**
**Project:** Web-Based Extension Services Project Management System for NEUST
**Date:** April 2026
────────────────────────

### **1. INTRODUCTION**

**1.1 Purpose**
This document explicitly defines the system-level requirements for the Web-Based Extension Services Project Management System for the Nueva Ecija University of Science and Technology (NEUST). It serves as the definitive baseline for software engineering, relational database architecture, and ISO/IEC 25010 empirical evaluation.

**1.2 Scope**
The system is a centralized enterprise web application engineered to digitize the extension service lifecycle across all NEUST main and satellite campuses. While titled a "Project Management System," the operational scope explicitly functions as a macro-level Project Portfolio and Document Governance platform. The scope bounds the system to multi-stage proposal evaluation (Endorsements and Approvals), spatial PDF annotation, active project monitoring, Memoranda of Agreement (MOA) tracking, individualized Special Order (SO) processing, temporal expiration alerts, and institutional reporting.

**1.3 Product Perspective**
The software operates as a decoupled microservice architecture housed within a strict `pnpm` monorepo:
*   **Client Node:** Next.js 16 utilizing native `fetch`, TanStack React Query, and `shadcn/ui`.
*   **Controller Node:** Hono API framework generating an OpenAPI 3.0 (Swagger) specification.
*   **Data Node:** Supabase PostgreSQL leveraging Drizzle ORM for relational queries, Supabase Auth for JWT issuance, and Supabase Storage for binary document retention.
*   **Observability Node:** Sentry (Asynchronous Error Tracking).

**1.4 User Characteristics (Role-Based Access Control)**
*   **Super Admin:** Technical administrators managing IT governance, audit logs, and global user provisioning.
*   **Director / Admin:** Executive stakeholders responsible for final University Approvals and institutional dashboard analysis.
*   **RET Chair:** Coordinators responsible for evaluating and Endorsing proposals, and managing localized users via campus/department routing.
*   **Faculty:** Project Leaders and Members submitting proposals, MOAs, and progress reports.

---

### **2. REFERENCES**
*   **ISO/IEC/IEEE 29148:2018** – Systems and Software Engineering — Requirements Engineering.
*   **ISO/IEC 25010:2023** – Systems and Software Quality Requirements and Evaluation (SQuaRE).
*   **Republic Act No. 10173** – Data Privacy Act of 2012 (Philippines).
*   **Republic Act No. 9470** – National Archives of the Philippines Act (Governing Institutional Data Retention).

---

### **3. SPECIFIC REQUIREMENTS**

#### **3.1 External Interfaces**
*   **API-01:** The frontend SHALL communicate with the Hono backend exclusively via RESTful HTTP methods secured by Supabase JWT HttpOnly cookies.
*   **DB-01:** The Hono backend SHALL interface with Supabase PostgreSQL strictly via Drizzle ORM to ensure type-safe, SQL-injection-proof queries.
*   **STO-01:** Document binaries (PDFs) SHALL upload directly to Supabase Storage, secured natively by PostgreSQL Row Level Security (RLS) to mathematically prevent unauthorized access.

#### **3.2 Functional Requirements (Mapped to DFD Subsystems)**

**SYS-REQ-01: Authentication & User Routing**
*   **1.1** The system SHALL enforce granular organizational routing. Users are mapped to a specific `campus_id` and `department_id`.
*   **1.2** The system SHALL restrict Director and Super Admin account creation to manual provisioning by IT Administrators.

**SYS-REQ-02: Proposal Lifecycle & Spatial Annotation**
*   **2.1** The system SHALL enforce chronological version control for all uploaded Proposal Documents (NEUST-ESD-F001).
*   **2.2** The system SHALL allow stakeholders to leave asynchronous comments and spatial highlights (X/Y coordinates) on specific PDF document versions prior to formal evaluation.
*   **2.3** The system SHALL enforce a strict state machine: Proposals must be "Endorsed" by an RET Chair before unlocking the "Approve" function for the Director.

**SYS-REQ-03: Team & Administrative Tracking**
*   **3.1** The system SHALL track a single `project_leader_id` and a separate `proposal_members` list for additional collaborating faculty.
*   **3.2** The system SHALL allow the generation and tracking of `special_orders` linked strictly to individual `proposal_members` to accommodate individualized HR and Accounting deloading requirements.

**SYS-REQ-04: Project & MOA Management**
*   **4.1** The system SHALL require the linking of an active `moa_id` before a Project state can transition to "Ongoing."
*   **4.2** The system SHALL execute a scheduled background process (cron job) to evaluate MOA expiration dates against the System Clock, dispatching automated email payloads via the Resend API when thresholds are met.

#### **3.3 Logical Database Requirements (The Normalized Schema)**
*The PostgreSQL schema SHALL be normalized to at least 3rd Normal Form (3NF), utilizing junction tables for many-to-many relationships (Departments, Beneficiaries, SDGs). All transactional tables SHALL utilize `archived_at` timestamps to comply with RA 9470, strictly prohibiting hard SQL `DELETE` commands.*

**D1: ORGANIZATIONAL & USER SUBSYSTEM**
1.  **`roles`**: `role_id` (PK), `role_name` (UNIQUE).
2.  **`campuses`**: `campus_id` (PK), `campus_name` (UNIQUE).
3.  **`departments`**: `department_id` (PK), `department_name` (UNIQUE), `campus_id` (FK).
4.  **`users`**: `user_id` (PK/UUID), `role_id` (FK), `campus_id` (FK), `department_id` (FK-Nullable), `employee_id` (UNIQUE), `first_name`, `middle_name`, `last_name`, `name_suffix`, `academic_rank`, `email`, `is_active`, `created_at`, `updated_at`.

**D2: PROPOSAL & COLLABORATION SUBSYSTEM**
5.  **`proposals`**: `proposal_id` (PK/UUID), `project_leader_id` (FK to users), `campus_id` (FK), `department_id` (FK - Lead Department), `title`, `banner_program`, `project_locale`, `extension_category`, `extension_agenda`, `budget_partner`, `budget_neust`, `current_status`, `revision_num`, `created_at`, `updated_at`, `archived_at`.
6.  **`proposal_departments`**: `proposal_id` (FK), `department_id` (FK), `added_at`. *(Handles many-to-many departmental collaboration).*
7.  **`proposal_members`**: `member_id` (PK/UUID), `proposal_id` (FK), `user_id` (FK), `project_role`, `added_at`.
8.  **`beneficiary_sectors`**: `sector_id` (PK), `sector_name` (UNIQUE).
9.  **`proposal_beneficiaries`**: `proposal_id` (FK), `sector_id` (FK).
10. **`sdgs`**: `sdg_id` (PK), `sdg_number` (UNIQUE), `sdg_title`.
11. **`proposal_sdgs`**: `proposal_id` (FK), `sdg_id` (FK).
12. **`special_orders`**: `special_order_id` (PK/UUID), `member_id` (FK), `so_number`, `storage_path`, `date_issued`, `status`, `archived_at`.
13. **`proposal_documents`**: `document_id` (PK/UUID), `proposal_id` (FK), `storage_path`, `version_num`, `uploaded_at`.
14. **`proposal_comments`**: `comment_id` (PK/UUID), `proposal_id` (FK), `document_id` (FK), `user_id` (FK), `comment_text`, `annotation_json`, `created_at`.
15. **`proposal_reviews`**: `review_id` (PK/UUID), `proposal_id` (FK), `reviewer_id` (FK), `review_stage`, `decision`, `comments`, `reviewed_at`.

**D3: PROJECT & MOA SUBSYSTEM**
16. **`moas`**: `moa_id` (PK/UUID), `partner_name` (UNIQUE), `partner_type`, `storage_path`, `valid_from`, `valid_until`, `is_expired`, `archived_at`.
17. **`projects`**: `project_id` (PK/UUID), `proposal_id` (FK-UNIQUE), `moa_id` (FK), `start_date`, `target_end`, `project_status`, `archived_at`.

**D4: GOVERNANCE SUBSYSTEM**
18. **`progress_reports`**: `report_id` (PK/UUID), `project_id` (FK), `submitted_by` (FK), `storage_path`, `remarks`, `submitted_at`.
19. **`audit_logs`**: `log_id` (PK/UUID), `user_id` (FK), `action`, `table_affected`, `ip_address`, `created_at`.
20. **`system_settings`**: `setting_key` (PK), `setting_value`, `updated_at`.

#### **3.4 Software Quality Attributes (ISO/IEC 25010)**
*   **SQA-01 (Performance Efficiency):** Drizzle ORM SHALL execute prepared SQL statements to ensure Sub-200ms API response times.
*   **SQA-02 (Maintainability):** Sentry SHALL be integrated for real-time exception tracking.
*   **SQA-03 (Usability):** Interfaces SHALL be validated using the System Usability Scale (SUS).
*   **SQA-04 (Security):** Supabase RLS SHALL mathematically restrict data access at the infrastructure layer.

#### **3.5 Edge Cases & Business Rules**
*   **EC-01 (Conflict of Interest):** Reviewers SHALL NOT review proposals where they are the Project Leader.
*   **EC-02 (Collaborative Units):** Proposals MUST specify a Lead Department but MAY include multiple Collaborating Departments to accurately reflect interdisciplinary extensions.
*   **EC-03 (Special Order Granularity):** Special Orders MUST be mapped strictly to individual `proposal_members`.
*   **EC-04 (Document Preservation):** All document versions and annotations MUST be preserved during revisions.
*   **EC-05 (Stacked Rejections):** Every review decision MUST be recorded as a unique historical entry in `proposal_reviews`.
