
# **SYSTEM DATASTORES (LEVEL 1 ONLY)**
* **D1**: Users Datastore
* **D2**: Proposals Datastore
* **D3**: MOA Records Datastore
* **D4**: Projects Datastore
* **D5**: Project Reports Datastore
* **D6**: Activity Logs Datastore
* **D7**: Pending Verification Codes

---

# **CONTEXT DIAGRAM**

**Process 0:** NEUST Extension Services Project Management System

### **Super Admin**
* Super Admin → 0 — Access Data
* Super Admin → 0 — User Management Data
* Super Admin → 0 — Audit Request
* 0 → Super Admin — Access Response
* 0 → Super Admin — Account Status Notice
* 0 → Super Admin — User Review Data
* 0 → Super Admin — User Search Results
* 0 → Super Admin — Audit Reports

### **Director**
* Director → 0 — Access Data
* Director → 0 — Dashboard Request
* Director → 0 — Overview Request
* Director → 0 — MOA Management Data
* Director → 0 — Evaluation Decision Data
* Director → 0 — Project Management Data
* 0 → Director — Access Response
* 0 → Director — Account Status Notice
* 0 → Director — Dashboard Metrics
* 0 → Director — MOA Review Data
* 0 → Director — Proposal Review Data
* 0 → Director — Project Status Data

### **RET Chair**
* RET Chair → 0 — Access Data
* RET Chair → 0 — Roster Request
* RET Chair → 0 — Dashboard Request
* RET Chair → 0 — Proposal Submissions
* RET Chair → 0 — Evaluation Decision Data
* RET Chair → 0 — Project Updates
* RET Chair → 0 — Report Submissions
* 0 → RET Chair — Access Response
* 0 → RET Chair — Account Status Notice
* 0 → RET Chair — Faculty Roster
* 0 → RET Chair — Dashboard Metrics
* 0 → RET Chair — Proposal Review Data
* 0 → RET Chair — Project Status Data

### **Faculty**
* Faculty → 0 — Access Data
* Faculty → 0 — Dashboard Request
* Faculty → 0 — Proposal Submissions
* Faculty → 0 — Project Updates
* Faculty → 0 — Report Submissions
* 0 → Faculty — Access Response
* 0 → Faculty — Account Status Notice
* 0 → Faculty — Dashboard Metrics
* 0 → Faculty — Project Status Data

**Combined flow definitions:**
* **Access Data** = Access Credentials + Registration Details *(where applicable)* + Password Reset Request + Verification Code Submission + New Password Data
* **Access Response** = Access Authorization + Verification Code Notice
* **User Management Data** = Account Management Request + Selected User ID + Role Assignment + Approval / Rejection Decision + New User Data + User Search Request + User Query + Updated Role Assignment
* **User Review Data** = Pending User Records + User Details
* **Audit Request** = Audit Log Request + Filter And Search Parameters
* **Audit Reports** = Filtered Log Results + System Audit Trail Data
* **MOA Management Data** = MOA Document and Validity Dates + Updated Validity Dates + Selected MOA
* **MOA Review Data** = MOA Status + Linked Project List
* **Evaluation Decision Data** = Approval Decision *(Director)* + Evaluation Decision And Comments *(RET Chair)* + Return Or Rejection Decision *(where applicable)* + Approved Proposal Scan *(Director)*
* **Proposal Submissions** = Proposal Documents + Special Order Documents + Revised Proposal Documents
* **Proposal Review Data** = Proposal Details
* **Project Management Data** = Project Implementation Updates + Activation Request + Selected MOA + Reporting Schedule + Closure Approval Decision
* **Project Updates** = Project Implementation Updates
* **Report Submissions** = Progress Report Documents + Terminal Report + Final Accomplishment Report + Overdue Report Response
* **Dashboard Metrics** = Project Metrics + College Project Metrics *(where applicable)* + Faculty Activity Overview *(where applicable)*
* **Project Status Data** = Submission Acknowledgment + Proposal Status And Feedback *(where applicable)* + Active Project Status + MOA Expiry Alert *(Director only)* + Overdue Report Alert *(RET Chair / Faculty)* + Report Acknowledgment

---

# **LEVEL 0 DFD**

**Process 1 — Manage User Accounts**
* Super Admin → 1 — Account Management Request
* Super Admin → 1 — Registration Decision Data *(= Selected User ID + Approval/Rejection Decision)*
* Super Admin → 1 — Role Update Data *(= User Query + Updated Role Assignment)*
* Super Admin → 1 — Role Assignment
* Super Admin → 1 — New User Data
* Super Admin → 1 — User Search Request
* RET Chair → 1 — Roster Request
* 2 → 1 — Pending User Record
* 1 → Super Admin — Pending User Records
* 1 → Super Admin — User Details
* 1 → Super Admin — User Search Results
* 1 → RET Chair — Faculty Roster
* 1 → Super Admin — Account Status Notice
* 1 → Director — Account Status Notice
* 1 → RET Chair — Account Status Notice
* 1 → Faculty — Account Status Notice
* 1 → 2 — Account Provisioning Data *(= Activated/Rejected User Record + Provisioned User Record)*
* 1 → 3 — Faculty List
* 1 → 9 — User Management Event Data

**Process 2 — Manage System Access**
* Super Admin → 2 — Access Credentials
* Super Admin → 2 — Password Reset Data *(= Password Reset Request + Verification Code Submission + New Password Data)*
* Director → 2 — Access Credentials
* Director → 2 — Password Reset Data
* RET Chair → 2 — Access Credentials
* RET Chair → 2 — Registration Details
* RET Chair → 2 — Password Reset Data
* Faculty → 2 — Access Credentials
* Faculty → 2 — Registration Details
* Faculty → 2 — Password Reset Data
* 1 → 2 — Account Provisioning Data
* 2 → Super Admin — Access Authorization
* 2 → Super Admin — Verification Code Notice
* 2 → Director — Access Authorization
* 2 → Director — Verification Code Notice
* 2 → RET Chair — Access Authorization
* 2 → RET Chair — Verification Code Notice
* 2 → RET Chair — Account Status Notice
* 2 → Faculty — Access Authorization
* 2 → Faculty — Verification Code Notice
* 2 → Faculty — Account Status Notice
* 2 → 1 — Pending User Record
* 2 → 9 — Access Event Data

**Process 3 — Monitor Dashboard**
* Director → 3 — Dashboard Request
* Director → 3 — Overview Request
* RET Chair → 3 — Dashboard Request
* Faculty → 3 — Dashboard Request
* 1 → 3 — Faculty List
* 4 → 3 — Proposal Records
* 7 → 3 — Aggregated Project Data
* 7 → 3 — Project Records
* 8 → 3 — Project Report Metrics
* 3 → Director — Faculty Activity Overview
* 3 → Director — Project Metrics
* 3 → RET Chair — College Project Metrics
* 3 → RET Chair — Project Metrics
* 3 → Faculty — Project Metrics

**Process 4 — Manage Project Proposals**
* RET Chair → 4 — Proposal Documents
* RET Chair → 4 — Revised Proposal Documents
* RET Chair → 4 — Special Order Documents
* Faculty → 4 — Proposal Documents
* Faculty → 4 — Revised Proposal Documents
* Faculty → 4 — Special Order Documents
* 6 → 4 — Proposal Disposition Data *(= Updated Proposal Status + Proposal Feedback Record)*
* 4 → RET Chair — Submission Acknowledgment
* 4 → Faculty — Submission Acknowledgment
* 4 → 6 — Proposal Evaluation Data *(= Pending Proposal Record + Submission History)*
* 4 → 3 — Proposal Records
* 4 → 9 — Proposal Event Data

**Process 5 — Manage MOA Records**
* Director → 5 — MOA Submission Data *(= MOA Document and Validity Dates + Updated Validity Dates)*
* Director → 5 — Selected MOA
* 7 → 5 — Linked Project Data
* 5 → Director — MOA Status
* 5 → Director — Linked Project List
* 5 → 7 — Verified MOA Reference
* 5 → 7 — MOA Validity Dates
* 5 → 9 — MOA Event Data

**Process 6 — Evaluate Project Proposal**
* RET Chair → 6 — Chair Evaluation Decision *(= Evaluation Decision And Comments + Return Or Rejection Decision)*
* Director → 6 — Director Evaluation Decision *(= Approval Decision + Return Or Rejection Decision)*
* Director → 6 — Approved Proposal Scan
* 4 → 6 — Proposal Evaluation Data
* 6 → RET Chair — Proposal Details
* 6 → Director — Proposal Details
* 6 → Faculty — Proposal Status And Feedback
* 6 → 4 — Proposal Disposition Data
* 6 → 7 — Institutionally Approved Proposal Record
* 6 → 9 — Evaluation Event Data

**Process 7 — Manage Projects**
* Director → 7 — Project Activation Data *(= Activation Request + Selected MOA + Reporting Schedule)*
* Director → 7 — Project Implementation Updates
* Director → 7 — Closure Approval Decision
* RET Chair → 7 — Project Implementation Updates
* Faculty → 7 — Project Implementation Updates
* 5 → 7 — Verified MOA Reference
* 5 → 7 — MOA Validity Dates
* 6 → 7 — Institutionally Approved Proposal Record
* 8 → 7 — Submitted Report Records
* 7 → Director — Active Project Status
* 7 → Director — MOA Expiry Alert
* 7 → RET Chair — Active Project Status
* 7 → RET Chair — Overdue Report Alert
* 7 → Faculty — Active Project Status
* 7 → Faculty — Overdue Report Alert
* 7 → 5 — Linked Project Data
* 7 → 3 — Aggregated Project Data
* 7 → 3 — Project Records
* 7 → 8 — Project Context Package *(= Active Project Context + Project Reporting Schedule)*
* 7 → 9 — Project Event Data

**Process 8 — Manage Project Reports**
* RET Chair → 8 — Progress Report Documents
* RET Chair → 8 — Project Closure Reports *(= Terminal Report + Final Accomplishment Report)*
* Faculty → 8 — Progress Report Documents
* Faculty → 8 — Project Closure Reports
* RET Chair → 8 — Overdue Report Response
* Faculty → 8 — Overdue Report Response
* 7 → 8 — Project Context Package
* 8 → RET Chair — Report Acknowledgment
* 8 → Faculty — Report Acknowledgment
* 8 → 7 — Submitted Report Records
* 8 → 3 — Project Report Metrics
* 8 → 9 — Report Event Data

**Process 9 — Manage Activity Logs**
* Super Admin → 9 — Audit Log Request
* Super Admin → 9 — Filter And Search Parameters
* 1 → 9 — User Management Event Data
* 2 → 9 — Access Event Data
* 4 → 9 — Proposal Event Data
* 5 → 9 — MOA Event Data
* 6 → 9 — Evaluation Event Data
* 7 → 9 — Project Event Data
* 8 → 9 — Report Event Data
* 9 → Super Admin — System Audit Trail Data
* 9 → Super Admin — Filtered Log Results

---

# **LEVEL 1 DFDs**

## **LEVEL 1 DFD — Process 1: Manage User Accounts**

* Super Admin → 1.1 — Account Management Request
* Super Admin → 1.1 — Selected User ID
* D1 → 1.1 — Pending User Records
* 1.1 → Super Admin — Pending User Records
* 1.1 → Super Admin — User Details
* 1.1 → 1.2 — Selected User Record

* Super Admin → 1.2 — Role Assignment
* Super Admin → 1.2 — Approval / Rejection Decision
* Super Admin → 1.2 — User Query
* D1 → 1.2 — Existing User Record
* Super Admin → 1.2 — Updated Role Assignment
* 1.1 → 1.2 — Selected User Record
* 1.2 → D1 — Activated / Rejected User Record
* 1.2 → D1 — Updated User Record
* 1.2 → 1.3 — Processed Account Data

* 1.2 → 1.3 — Processed Account Data
* 1.3 → Faculty — Account Status Notice
* 1.3 → RET Chair — Account Status Notice
* 1.3 → Director — Account Status Notice
* 1.3 → Super Admin — Account Status Notice
* 1.3 → D6 — User Management Event Data

* RET Chair → 1.4 — Roster Request
* Super Admin → 1.4 — User Search Request
* D1 → 1.4 — Scope Parameters
* D1 → 1.4 — User Records
* 1.4 → RET Chair — Faculty Roster
* 1.4 → Super Admin — User Search Results

* Super Admin → 1.5 — New User Data
* Super Admin → 1.5 — Role Assignment
* 1.5 → D1 — Provisioned User Record
* 1.5 → Faculty — Account Status Notice
* 1.5 → RET Chair — Account Status Notice
* 1.5 → Director — Account Status Notice
* 1.5 → Super Admin — Account Status Notice
* 1.5 → D6 — User Management Event Data

**Sub-processes:**
* **1.1 — Evaluate Pending Registrations** — Establishes the admin's pending registration view by reading the users datastore, receiving the Super Admin's selected record ID, and outputting selected details.
* **1.2 — Authorize User Profile** — Processes the Super Admin's action on a user record as one of three mutually exclusive outcomes: approve a selected pending record, reject it, or — when the Super Admin instead retrieves an active user directly by query — update that user's role assignment. Records the outcome in D1 and forwards it to 1.3 for notification.
* **1.3 — Finalize Activation** — Issues account state notifications to the relevant actor and logs the administrative approval event.
* **1.4 — Generate User Roster** — Reads user profiles from the users datastore filtered by RET Chair campus scope or Admin search parameters; returns a faculty roster to the RET Chair and search results to the Super Admin.
* **1.5 — Provision Account** — Directly constructs and activates primary system profiles for administrative actors.

---

## **LEVEL 1 DFD — Process 2: Manage System Access**

* Super Admin → 2.1 — Access Credentials
* Director → 2.1 — Access Credentials
* RET Chair → 2.1 — Access Credentials
* Faculty → 2.1 — Access Credentials
* D1 → 2.1 — Activated / Rejected User Record
* D1 → 2.1 — Provisioned User Record
* 2.1 → Super Admin — Access Authorization
* 2.1 → Director — Access Authorization
* 2.1 → RET Chair — Access Authorization
* 2.1 → Faculty — Access Authorization
* 2.1 → D6 — Access Event Data

* RET Chair → 2.2 — Registration Details
* Faculty → 2.2 — Registration Details
* 2.2 → RET Chair — Account Status Notice
* 2.2 → Faculty — Account Status Notice
* 2.2 → D1 — Pending User Record
* 2.2 → D6 — Access Event Data

* Super Admin → 2.3 — Password Reset Request
* Director → 2.3 — Password Reset Request
* RET Chair → 2.3 — Password Reset Request
* Faculty → 2.3 — Password Reset Request
* D1 → 2.3 — Activated / Rejected User Record
* 2.3 → Super Admin — Verification Code Notice
* 2.3 → Director — Verification Code Notice
* 2.3 → RET Chair — Verification Code Notice
* 2.3 → Faculty — Verification Code Notice
* 2.3 → D7 — Verification Code Record

* Super Admin → 2.4 — Verification Code Submission
* Director → 2.4 — Verification Code Submission
* RET Chair → 2.4 — Verification Code Submission
* Faculty → 2.4 — Verification Code Submission
* D7 → 2.4 — Verification Code Record
* Super Admin → 2.4 — New Password Data
* Director → 2.4 — New Password Data
* RET Chair → 2.4 — New Password Data
* Faculty → 2.4 — New Password Data
* 2.4 → D1 — Updated Password Record
* 2.4 → D7 — Invalidated Verification Code
* 2.4 → D6 — Access Event Data

**Sub-processes:**
* **2.1 — Authenticate User** — Validates submitted credentials against the activated or provisioned user record and issues authorization.
* **2.2 — Process Self-Registration** — Records user registration requests to the users datastore in a pending state.
* **2.3 — Generate Reset Verification Code** — Confirms the account is active or provisioned, then generates and registers a verification code transaction.
* **2.4 — Finalize Password Reset** — Verifies the submitted verification code against the active verification datastore; on success, accepts the new password, updates the stored user record, and invalidates the used verification code.

---

## **LEVEL 1 DFD — Process 3: Monitor Dashboard**

* Director → 3.1 — Dashboard Request
* RET Chair → 3.1 — Dashboard Request
* Faculty → 3.1 — Dashboard Request
* D2 → 3.1 — Proposal Records
* D4 → 3.1 — Aggregated Project Data
* D4 → 3.1 — Project Records
* D5 → 3.1 — Project Report Metrics
* 3.1 → Director — Project Metrics
* 3.1 → Faculty — Project Metrics
* 3.1 → RET Chair — Project Metrics
* 3.1 → RET Chair — College Project Metrics

* Director → 3.2 — Overview Request
* D1 → 3.2 — Faculty List
* D2 → 3.2 — Proposal Records
* D4 → 3.2 — Project Records
* 3.2 → Director — Faculty Activity Overview

**Sub-processes:**
* **3.1 — Generate Standard Dashboard** — Extracts metrics from the proposals, projects, and reports datastores and displays role-specific dashboard metrics.
* **3.2 — Generate Faculty Overview** — Compiles overall proposal and project counts by project leader, cross-referenced against the faculty list retrieved from D1, to structure the faculty activity ranking.

---

## **LEVEL 1 DFD — Process 4: Manage Project Proposals**

* Faculty → 4.1 — Proposal Documents
* RET Chair → 4.1 — Proposal Documents
* Faculty → 4.1 — Special Order Documents
* RET Chair → 4.1 — Special Order Documents
* D2 → 4.1 — Existing Proposal State
* 4.1 → 4.2 — Reviewed Proposal Details

* 4.2 → D2 — Validated Proposal Data
* 4.2 → D2 — Pending Proposal Record
* 4.2 → D2 — Submission History
* 4.2 → D2 — Proposal Records
* 4.2 → D2 — Special Order Records
* 4.2 → 4.3 — Recorded Proposal Core Details

* 4.3 → Faculty — Submission Acknowledgment
* 4.3 → RET Chair — Submission Acknowledgment
* 4.3 → D6 — Proposal Event Data

* Faculty → 4.4 — Revised Proposal Documents
* RET Chair → 4.4 — Revised Proposal Documents
* D2 → 4.4 — Existing Proposal State
* D2 → 4.4 — Updated Proposal Status
* D2 → 4.4 — Proposal Feedback Record
* D2 → 4.4 — Submission History
* 4.4 → Faculty — Submission Acknowledgment
* 4.4 → RET Chair — Submission Acknowledgment
* 4.4 → D2 — Pending Proposal Record
* 4.4 → D2 — Revised Proposal Record
* 4.4 → D2 — Submission History
* 4.4 → D2 — Proposal Records
* 4.4 → D6 — Proposal Event Data

**Sub-processes:**
* **4.1 — Review Proposal Submission** — Compares the initial proposal document details, including the per-member special order documents submitted alongside it, against existing active proposal records to prevent duplicates.
* **4.2 — Record Proposal Data** — Validates and writes proposal records into the proposals datastore with an initial status of "pending review," records the accompanying special order documents against the proposal, appends an entry to the submission history, and updates the aggregate proposal records for dashboard retrieval.
* **4.3 — Route Proposal for Review** — Forwards active core details representing pending records into the evaluation flow and issues receipts.
* **4.4 — Process Proposal Resubmission** — Validates revised proposal documents against the stored status, feedback record, and submission history, routes to active review, appends the resubmission to the submission history, and updates the aggregate proposal records for dashboard retrieval. Reached only when a prior evaluation stage set status to "returned."

---

## **LEVEL 1 DFD — Process 5: Manage MOA Records**

* Director → 5.1 — MOA Document and Validity Dates
* Director → 5.1 — Updated Validity Dates
* D3 → 5.1 — Existing MOA Records
* 5.1 → Director — MOA Status
* 5.1 → D3 — Reviewed MOA Data
* 5.1 → D3 — Verified MOA Reference
* 5.1 → D3 — MOA Validity Dates
* 5.1 → D6 — MOA Event Data

* Director → 5.2 — Selected MOA
* D4 → 5.2 — Linked Project Data
* 5.2 → Director — Linked Project List

**Sub-processes:**
* **5.1 — Process MOA Registration** — Reviews submitted documents against existing MOA records, updates MOA states, records the validated validity dates, and registers system validation.
* **5.2 — Review Linked Projects** — Aggregates all project records linked to a specific MOA.

---

## **LEVEL 1 DFD — Process 6: Evaluate Project Proposal**

* D2 → 6.1 — Pending Proposal Record
* D2 → 6.1 — Submission History
* D1 → 6.1 — Submitter Role
* 6.1 → 6.2 — Retrieved Proposal Details
* 6.1 → 6.3 — Retrieved Endorsement Details

* RET Chair → 6.2 — Evaluation Decision And Comments
* RET Chair → 6.2 — Return Or Rejection Decision
* 6.1 → 6.2 — Retrieved Proposal Details
* 6.2 → RET Chair — Proposal Details
* 6.2 → Faculty — Proposal Status And Feedback
* 6.2 → D2 — Updated Proposal Status
* 6.2 → D2 — Proposal Feedback Record
* 6.2 → D2 — Endorsed Proposal Record
* 6.2 → D6 — Evaluation Event Data

* Director → 6.3 — Approval Decision
* Director → 6.3 — Return Or Rejection Decision
* 6.1 → 6.3 — Retrieved Endorsement Details
* D2 → 6.3 — Endorsed Proposal Record
* D2 → 6.3 — Proposal Feedback Record
* 6.3 → Director — Proposal Details
* 6.3 → Faculty — Proposal Status And Feedback
* 6.3 → D2 — Updated Proposal Status
* 6.3 → D2 — Approved Proposal Record
* 6.3 → D2 — Proposal Feedback Record
* 6.3 → D6 — Evaluation Event Data

* D2 → 6.4 — Approved Proposal Record
* Director → 6.4 — Approved Proposal Scan
* 6.4 → D2 — Institutionally Approved Proposal Record
* 6.4 → Faculty — Proposal Status And Feedback
* 6.4 → D6 — Evaluation Event Data

**Sub-processes:**
* **6.1 — Retrieve Proposal Details** — Retrieves pending proposals, submission histories, and the submitter's role from the datastores; routes to Chair Endorsement (6.2) for standard review, or directly to Director Approval (6.3) — bypassing the "endorsed" status entirely — when the RET Chair stage was already cleared in a prior submission cycle, or when the submitting user holds the RET Chair role.
* **6.2 — Process Chair Endorsement** — Evaluates the RET Chair's decision as one of three mutually exclusive outcomes — endorse, return, or reject; on endorsement, writes an Endorsed Proposal Record to the datastore alongside status and feedback updates.
* **6.3 — Process Director Approval** — Evaluates the Director's final decision, based on the stored endorsement record, as one of three mutually exclusive outcomes — approve, return, or reject; on approval, records the Director-approved proposal in D2, pending institutional sign-off via 6.4 before project activation can proceed.
* **6.4 — Record Institutional Approval** — Confirms the Director-approved proposal record already exists in D2, records the Director's uploaded scan of the institutionally signed proposal, and finalizes the proposal as institutionally approved — the record Process 7 requires before activation can proceed. Notifies the project leader of the finalized status.

---

## **LEVEL 1 DFD — Process 7: Manage Projects**

* D2 → 7.1 — Institutionally Approved Proposal Record
* D2 → 7.1 — Special Order Records
* 7.1 → D4 — Special Order Records

* Director → 7.2 — Activation Request
* Director → 7.2 — Selected MOA
* Director → 7.2 — Reporting Schedule
* D3 → 7.2 — Verified MOA Reference
* D4 → 7.2 — Special Order Records
* 7.2 → Director — Active Project Status
* 7.2 → RET Chair — Active Project Status
* 7.2 → Faculty — Active Project Status
* 7.2 → D4 — New Active Project Record
* 7.2 → D4 — Active Project Context
* 7.2 → D4 — Project Reporting Schedule
* 7.2 → D4 — Linked Project Data
* 7.2 → D6 — Project Event Data

* Director → 7.3 — Project Implementation Updates
* RET Chair → 7.3 — Project Implementation Updates
* Faculty → 7.3 — Project Implementation Updates
* D4 → 7.3 — Active Project Record
* 7.3 → Director — Active Project Status
* 7.3 → RET Chair — Active Project Status
* 7.3 → Faculty — Active Project Status
* 7.3 → D4 — Project Update Record
* 7.3 → D6 — Project Event Data

* D4 → 7.4 — Active Project Records
* D3 → 7.4 — MOA Validity Dates
* 7.4 → Director — MOA Expiry Alert
* 7.4 → D4 — MOA Expired Flag
* 7.4 → D6 — Project Event Data

* D3 → 7.5 — Verified MOA Reference
* D4 → 7.5 — Active Project Records (Linked MOA)
* 7.5 → D4 — Updated MOA Reference
* 7.5 → D4 — Cleared MOA Expired Flag
* 7.5 → D6 — Project Event Data

* D4 → 7.6 — Project Reporting Schedule
* D5 → 7.6 — Submitted Report Records
* 7.6 → Faculty — Overdue Report Alert
* 7.6 → RET Chair — Overdue Report Alert
* 7.6 → D4 — Report Overdue Flag
* 7.6 → D6 — Project Event Data

* D4 → 7.7 — Active Project Records
* 7.7 → D4 — Aggregated Project Data
* 7.7 → D4 — Project Records

* Director → 7.8 — Closure Approval Decision
* D4 → 7.8 — Pending Closure Project Records
* 7.8 → Director — Active Project Status
* 7.8 → RET Chair — Active Project Status
* 7.8 → Faculty — Active Project Status
* 7.8 → D4 — Closed Project Record
* 7.8 → D6 — Project Event Data

**Sub-processes:**
* **7.1 — Record Special Orders** — Retrieves the special order records and institutionally approved proposal record from D2 for proposals cleared for activation, and promotes the stored special order records into the projects datastore.
* **7.2 — Process Project Activation** — Retrieves recorded special order data from D4, validates MOA status, and establishes the active project record with an initial status of "ongoing," schedules, MOA linkage, and dependencies in D4. *(Decomposed at Level 2 — see below.)*
* **7.3 — Process Project Update** — Reads project parameters from the projects datastore and commits update records and status changes.
* **7.4 — Monitor MOA Validity** — Temporal process, executed on a configured schedule rather than triggered by a user, that compares active project MOA metrics against validity dates and sets the MOA Expired Flag when a linked MOA has lapsed, alerting the Director.
* **7.5 — Update Linked MOA** — Retrieves active projects linked to the renewed MOA, re-links the updated reference, and clears the MOA Expired Flag on each affected project.
* **7.6 — Monitor Report Deadlines** — Temporal process, executed on a configured schedule rather than triggered by a user, that evaluates actual report files against scheduled dates and sets the Report Overdue Flag when a project falls behind schedule.
* **7.7 — Update Project Metrics** — Reads active project records from D4 and writes aggregated project data and project records back to D4 for dashboard retrieval.
* **7.8 — Approve Project Closure** — Retrieves projects in "pending closure" status from D4; processes the Director's closure approval decision, transitioning the project record to "closed," and notifies all associated actors of the final status. Approve-only; no return or rejection path.

---

## **LEVEL 1 DFD — Process 8: Manage Project Reports**

* Faculty → 8.1 — Progress Report Documents
* RET Chair → 8.1 — Progress Report Documents
* D4 → 8.1 — Active Project Context
* D4 → 8.1 — Project Reporting Schedule
* 8.1 → Faculty — Report Acknowledgment
* 8.1 → RET Chair — Report Acknowledgment
* 8.1 → D5 — Progress Report Record
* 8.1 → D5 — Submitted Report Records
* 8.1 → D6 — Report Event Data

* Faculty → 8.2 — Progress Report Documents
* Faculty → 8.2 — Overdue Report Response
* RET Chair → 8.2 — Progress Report Documents
* RET Chair → 8.2 — Overdue Report Response
* D4 → 8.2 — Active Project Context
* D4 → 8.2 — Project Reporting Schedule
* D4 → 8.2 — Report Overdue Flag
* 8.2 → Faculty — Report Acknowledgment
* 8.2 → RET Chair — Report Acknowledgment
* 8.2 → D5 — Progress Report Record
* 8.2 → D5 — Submitted Report Records
* 8.2 → D4 — Cleared Report Overdue Flag
* 8.2 → D6 — Report Event Data

* Faculty → 8.3 — Terminal Report
* Faculty → 8.3 — Final Accomplishment Report
* RET Chair → 8.3 — Terminal Report
* RET Chair → 8.3 — Final Accomplishment Report
* D4 → 8.3 — Active Project Context
* D4 → 8.3 — Project Reporting Schedule
* 8.3 → Faculty — Report Acknowledgment
* 8.3 → RET Chair — Report Acknowledgment
* 8.3 → D4 — Pending Closure Status
* 8.3 → D5 — Terminal Report Record
* 8.3 → D5 — Final Accomplishment Report Record
* 8.3 → D5 — Submitted Report Records
* 8.3 → D6 — Report Event Data

* D5 → 8.4 — Submitted Report Records
* 8.4 → D5 — Project Report Metrics

**Sub-processes:**
* **8.1 — Process Progress Report** — Evaluates progress documents against active schedules, writes the record and updates the aggregate submitted report records, and issues acknowledgments.
* **8.2 — Process Overdue Report** — Reads the project's Report Overdue Flag, processes the late submission, writes the record and updates the aggregate submitted report records, and clears the flag in D4.
* **8.3 — Execute Project Closure** — Validates concurrent submission of Terminal and Final Accomplishment Reports, writes both records and updates the aggregate submitted report records, and transitions the project record to "pending closure" status — awaiting the Director's final approval via Process 7.8.
* **8.4 — Update Report Metrics** — Aggregates submitted report statistics for dashboard retrieval.

---

## **LEVEL 1 DFD — Process 9: Manage Activity Logs**

* Super Admin → 9.1 — Audit Log Request
* D6 → 9.1 — Stored Audit Records
* 9.1 → 9.2 — Retrieved Log Details

* Super Admin → 9.2 — Filter And Search Parameters
* 9.1 → 9.2 — Retrieved Log Details
* 9.2 → Super Admin — System Audit Trail Data
* 9.2 → Super Admin — Filtered Log Results
* 9.2 → D6 — Audit Event Data

**Sub-processes:**
* **9.1 — Retrieve Baseline Log** — Interrogates the activity logs datastore to fetch historical audit records, using the Super Admin's request to scope retrieval.
* **9.2 — Generate Audit Trail** — Restructures retrieved log entries based on the Super Admin's filter parameters and logs access activity.

---

# **LEVEL 2 DFD**

## **LEVEL 2 DFD — Process 7.2: Process Project Activation**

* Director → 7.2.1 — Activation Request
* D4 → 7.2.1 — Special Order Records
* 7.2.1 → 7.2.3 — Validated Project Activation Data

* Director → 7.2.2 — Reporting Schedule
* 7.2.2 → 7.2.3 — Project Reporting Schedule Data

* 7.2.1 → 7.2.3 — Validated Project Activation Data
* 7.2.2 → 7.2.3 — Project Reporting Schedule Data
* Director → 7.2.3 — Selected MOA
* D3 → 7.2.3 — Verified MOA Reference
* 7.2.3 → D4 — New Active Project Record
* 7.2.3 → D4 — Active Project Context
* 7.2.3 → D4 — Project Reporting Schedule
* 7.2.3 → D4 — Linked Project Data
* 7.2.3 → Director — Active Project Status
* 7.2.3 → RET Chair — Active Project Status
* 7.2.3 → Faculty — Active Project Status
* 7.2.3 → D6 — Project Event Data

**Sub-processes:**
* **7.2.1 — Process Activation Request** — Retrieves recorded special order data from D4 and receives the Director's activation request; prepares the core activation data for record creation.
* **7.2.2 — Configure Reporting Schedule** — Receives the Director's specified reporting schedule and formats it for the active project record.
* **7.2.3 — Create Active Project Record** — Combines the validated activation data and reporting schedule with the Director's MOA selection — validated against D3's Verified MOA Reference — to create the active project record, establish its reporting schedule, link the verified MOA, notify all associated actors, and log the activation event.