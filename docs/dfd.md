# **SYSTEM DATASTORES (LEVEL 1 ONLY)**
* **`D1`**: Users Datastore
* **`D2`**: Proposals Datastore
* **`D3`**: MOA Records Datastore
* **`D4`**: Projects Datastore
* **`D5`**: Project Reports Datastore
* **`D6`**: Activity Logs Datastore
* **`D7`**: Password Reset Tokens

---

# **CONTEXT DIAGRAM**

**Process 0:** NEUST Extension Services Project Management System

### **Super Admin**
* Super Admin → 0 — Access Data
* Super Admin → 0 — User Management Data
* Super Admin → 0 — Audit Request
* 0 → Super Admin — Access Response
* 0 → Super Admin — User Review Data
* 0 → Super Admin — Audit Reports

### **Director**
* Director → 0 — Access Data
* Director → 0 — Dashboard Request
* Director → 0 — Overview Request
* Director → 0 — MOA Management Data
* Director → 0 — Evaluation Decision Data
* Director → 0 — Project Management Data
* 0 → Director — Access Response
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
* 0 → Faculty — Dashboard Metrics
* 0 → Faculty — Project Status Data

**Combined flow definitions:**
* **`Access Data`** = Access Credentials + Registration Details *(where applicable)* + Password Reset Request + Verification Code Submission + New Password Data
* **`Access Response`** = Access Authorization + Verification Code Notice + Account Status Notice *(where applicable)*
* **`User Management Data`** = Account Management Request + Selected User ID + Role Assignment + Approval / Rejection Decision + New User Data + Merge Decision + User Search Request
* **`User Review Data`** = Pending User Records + User Details + Duplicate Alert
* **`Audit Request`** = Audit Log Request + Filter And Search Parameters
* **`Audit Reports`** = Filtered Log Results + System Audit Trail Data
* **`MOA Management Data`** = MOA Document and Validity Dates + Updated Validity Dates + Selected MOA
* **`MOA Review Data`** = MOA Status + Linked Project List
* **`Evaluation Decision Data`** = Approval Decision + Evaluation Decision And Comments + Return Or Rejection Decision
* **`Proposal Submissions`** = Proposal Documents + Revised Proposal Documents + Proposal Withdrawal Request
* **`Proposal Review Data`** = Proposal Details
* **`Project Management Data`** = Project Implementation Updates + Activation Request + Selected MOA + Reporting Schedule + Special Order Documents
* **`Project Updates`** = Project Implementation Updates + Special Order Documents
* **`Report Submissions`** = Progress Report Documents + Terminal Report + Final Accomplishment Report
* **`Dashboard Metrics`** = Project Metrics + College Project Metrics *(where applicable)* + Faculty Activity Overview *(where applicable)*
* **`Project Status Data`** = Submission Acknowledgment + Proposal Status And Feedback + Active Project Status + Overdue Report Alert + Report Acknowledgment

---

# **LEVEL 0 DFD**

**Process 1 — Manage User Accounts**
* Super Admin → 1 — Account Management Request
* Super Admin → 1 — Selected User ID
* Super Admin → 1 — Role Assignment
* Super Admin → 1 — Approval / Rejection Decision
* Super Admin → 1 — New User Data
* Super Admin → 1 — Merge Decision
* Super Admin → 1 — User Search Request
* RET Chair → 1 — Roster Request
* 2 → 1 — Pending User Record
* 1 → Super Admin — Pending User Records
* 1 → Super Admin — User Details
* 1 → Super Admin — Duplicate Alert
* 1 → RET Chair — Faculty Roster
* 1 → Super Admin — Account Status Notice
* 1 → Director — Account Status Notice
* 1 → RET Chair — Account Status Notice
* 1 → Faculty — Account Status Notice
* 1 → 2 — Activated / Rejected User Record
* 1 → 2 — Provisioned / Updated User Record
* 1 → 9 — User Management Event Data

**Process 2 — Manage System Access**
* Super Admin → 2 — Access Credentials
* Super Admin → 2 — Password Reset Request
* Super Admin → 2 — Verification Code Submission
* Super Admin → 2 — New Password Data
* Director → 2 — Access Credentials
* Director → 2 — Password Reset Request
* Director → 2 — Verification Code Submission
* Director → 2 — New Password Data
* RET Chair → 2 — Access Credentials
* RET Chair → 2 — Registration Details
* RET Chair → 2 — Password Reset Request
* RET Chair → 2 — Verification Code Submission
* RET Chair → 2 — New Password Data
* Faculty → 2 — Access Credentials
* Faculty → 2 — Registration Details
* Faculty → 2 — Password Reset Request
* Faculty → 2 — Verification Code Submission
* Faculty → 2 — New Password Data
* 1 → 2 — Activated / Rejected User Record
* 1 → 2 — Provisioned / Updated User Record
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
* RET Chair → 4 — Proposal Withdrawal Request
* Faculty → 4 — Proposal Documents
* Faculty → 4 — Revised Proposal Documents
* Faculty → 4 — Proposal Withdrawal Request
* 6 → 4 — Proposal Status And Feedback
* 6 → 4 — Updated Proposal Status
* 4 → RET Chair — Submission Acknowledgment
* 4 → Faculty — Submission Acknowledgment
* 4 → 6 — Pending Proposal Record
* 4 → 6 — Submission History
* 4 → 6 — Existing Proposal State
* 4 → 3 — Proposal Records
* 4 → 9 — Proposal Event Data

**Process 5 — Manage MOA Records**
* Director → 5 — MOA Document and Validity Dates
* Director → 5 — Updated Validity Dates
* Director → 5 — Selected MOA
* 7 → 5 — Linked Project Data
* 5 → Director — MOA Status
* 5 → Director — Linked Project List
* 5 → 7 — Verified MOA Reference
* 5 → 7 — MOA Validity Dates
* 5 → 9 — MOA Event Data

**Process 6 — Evaluate Project Proposal**
* RET Chair → 6 — Evaluation Decision And Comments
* RET Chair → 6 — Return Or Rejection Decision
* Director → 6 — Approval Decision
* Director → 6 — Return Or Rejection Decision
* 4 → 6 — Pending Proposal Record
* 4 → 6 — Submission History
* 4 → 6 — Existing Proposal State
* 6 → RET Chair — Proposal Details
* 6 → Director — Proposal Details
* 6 → Faculty — Proposal Status And Feedback
* 6 → 4 — Proposal Status And Feedback
* 6 → 4 — Updated Proposal Status
* 6 → 7 — Approved Proposal Record
* 6 → 9 — Evaluation Event Data

**Process 7 — Manage Projects**
* Director → 7 — Activation Request
* Director → 7 — Selected MOA
* Director → 7 — Reporting Schedule
* Director → 7 — Special Order Documents
* Director → 7 — Project Implementation Updates
* RET Chair → 7 — Special Order Documents
* RET Chair → 7 — Project Implementation Updates
* Faculty → 7 — Special Order Documents
* Faculty → 7 — Project Implementation Updates
* 5 → 7 — Verified MOA Reference
* 5 → 7 — MOA Validity Dates
* 6 → 7 — Approved Proposal Record
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
* 7 → 8 — Active Project Context
* 7 → 8 — Project Reporting Schedule
* 7 → 9 — Project Event Data

**Process 8 — Manage Project Reports**
* RET Chair → 8 — Progress Report Documents
* RET Chair → 8 — Terminal Report
* RET Chair → 8 — Final Accomplishment Report
* Faculty → 8 — Progress Report Documents
* Faculty → 8 — Terminal Report
* Faculty → 8 — Final Accomplishment Report
* 7 → 8 — Active Project Context
* 7 → 8 — Project Reporting Schedule
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

# **LEVEL 1 DFDS**

## **LEVEL 1 DFD — Process 1: Manage User Accounts**

* Super Admin → 1.1 — Account Management Request
* Super Admin → 1.1 — Selected User ID  *(added — closes the miracle: 1.1 outputs "Selected User Record" but was never given the ID that identifies which pending record was chosen)*
* D1 → 1.1 — Pending User Records
* 1.1 → Super Admin — Pending User Records
* 1.1 → Super Admin — User Details
* 1.1 → 1.2 — Selected User Record

* Super Admin → 1.2 — Role Assignment
* Super Admin → 1.2 — Approval / Rejection Decision
* Super Admin → 1.2 — Merge Decision
* 1.1 → 1.2 — Selected User Record
* 1.2 → D1 — Activated / Rejected User Record
* 1.2 → Super Admin — Duplicate Alert
* 1.2 → 1.3 — Approved Account Data

* 1.2 → 1.3 — Approved Account Data
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
* **1.2 — Authorize User Profile** — Commits validated credentials, manages duplicate-profile merge decisions, and logs role assignments.
* **1.3 — Finalize Activation** — Issues account state notifications to the relative actor and logs the administrative approval event.
* **1.4 — Generate User Roster** — Reads user profiles from the users datastore filtered by RET Chair campus scope or Admin search parameters.
* **1.5 — Provision Account** — Directly constructs and activates primary system profiles for administrative actors.

---

## **LEVEL 1 DFD — Process 2: Manage System Access**

* Super Admin → 2.1 — Access Credentials
* Director → 2.1 — Access Credentials
* RET Chair → 2.1 — Access Credentials
* Faculty → 2.1 — Access Credentials
* D1 → 2.1 — Existing User Profile
* D1 → 2.1 — Stored Credentials
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
* D1 → 2.3 — Existing User Profile
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
* 2.4 → 2.5 — Validated Verification Data

* Super Admin → 2.5 — New Password Data
* Director → 2.5 — New Password Data
* RET Chair → 2.5 — New Password Data
* Faculty → 2.5 — New Password Data
* 2.4 → 2.5 — Validated Verification Data
* 2.5 → D1 — Updated Password Record
* 2.5 → D7 — Invalidated Verification Code
* 2.5 → D6 — Access Event Data

**Sub-processes:**
* **2.1 — Authenticate User** — Ingests user credentials, queries stored authentication cryptography, and issues authorization.
* **2.2 — Process Self-Registration** — Commits user registration requests to the users datastore in a pending state.
* **2.3 — Generate Reset Verification Code** — Evaluates account validity and registers verification code transactions.
* **2.4 — Validate Verification Code** — Verifies submitted challenge tokens asynchronously against the active verification datastore.
* **2.5 — Update Password** — Updates the stored user record and invalidates active verification transactions.

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
* **3.1 — Generate Standard Dashboard** — Extracts metrics from proposals, projects, and reports datastores and displays standard metrics.
* **3.2 — Generate Faculty Overview** — Compiles overall project counts by leader from database tables to structure active faculty rankings.

---

## **LEVEL 1 DFD — Process 4: Manage Project Proposals**

* Faculty → 4.1 — Proposal Documents
* RET Chair → 4.1 — Proposal Documents
* D2 → 4.1 — Existing Proposal State
* 4.1 → 4.2 — Reviewed Proposal Details

* 4.1 → 4.2 — Reviewed Proposal Details
* 4.2 → D2 — Validated Proposal Data
* 4.2 → D2 — Pending Proposal Record
* 4.2 → 4.3 — Recorded Proposal Core Details

* 4.2 → 4.3 — Recorded Proposal Core Details
* 4.3 → Faculty — Submission Acknowledgment
* 4.3 → RET Chair — Submission Acknowledgment
* 4.3 → D6 — Proposal Event Data

* Faculty → 4.4 — Revised Proposal Documents
* RET Chair → 4.4 — Revised Proposal Documents
* D2 → 4.4 — Existing Proposal State
* D2 → 4.4 — Proposal Status And Feedback
* D2 → 4.4 — Submission History
* 4.4 → Faculty — Submission Acknowledgment
* 4.4 → RET Chair — Submission Acknowledgment
* 4.4 → D2 — Pending Proposal Record
* 4.4 → D2 — Revised Proposal Record
* 4.4 → D6 — Proposal Event Data

* Faculty → 4.5 — Proposal Withdrawal Request
* RET Chair → 4.5 — Proposal Withdrawal Request
* D2 → 4.5 — Existing Proposal State
* 4.5 → D2 — Withdrawn Proposal Record
* 4.5 → D6 — Proposal Event Data

**Sub-processes:**
* **4.1 — Review Proposal Submission** — Compares the initial proposal document details against existing active proposal records to prevent duplicates.
* **4.2 — Record Proposal Data** — Validates and writes proposal records into the proposals datastore as a pending state.
* **4.3 — Route Proposal for Review** — Forwards active core details representing pending records into the evaluation flow and issues receipts.
* **4.4 — Process Proposal Resubmission** — Validates revised proposal documents against historic evaluation feedback and routes to active review.
* **4.5 — Process Proposal Withdrawal** — Flags pending proposals as withdrawn in the datastore on user request.

---

## **LEVEL 1 DFD — Process 5: Manage MOA Records**

* Director → 5.1 — MOA Document and Validity Dates
* Director → 5.1 — Updated Validity Dates
* D3 → 5.1 — Existing MOA Records
* 5.1 → Director — MOA Status
* 5.1 → D3 — Reviewed MOA Data
* 5.1 → D3 — Verified MOA Reference
* 5.1 → D6 — MOA Event Data

* Director → 5.2 — Selected MOA
* D4 → 5.2 — Linked Project Data
* 5.2 → Director — Linked Project List

**Sub-processes:**
* **5.1 — Process MOA Registration** — Reviews documents against active legal registers, updates MOA states, and registers system validation.
* **5.2 — Review Linked Projects** — Aggregates all project records in the database mapped to a specific legal contract.

---

## **LEVEL 1 DFD — Process 6: Evaluate Project Proposal**

* D2 → 6.1 — Pending Proposal Record
* D2 → 6.1 — Submission History
* 6.1 → 6.2 — Retrieved Proposal Details
* 6.1 → 6.3 — Retrieved Endorsement Details

* RET Chair → 6.2 — Evaluation Decision And Comments
* RET Chair → 6.2 — Return Or Rejection Decision
* 6.1 → 6.2 — Retrieved Proposal Details
* 6.2 → RET Chair — Proposal Details
* 6.2 → Faculty — Proposal Status And Feedback
* 6.2 → D2 — Updated Proposal Status
* 6.2 → D2 — Proposal Feedback Record
* 6.2 → D2 — Endorsed Proposal Record  *(added — closes the miracle: 6.3 reads "Endorsed Proposal Record" from D2, but nothing previously wrote a flow by that name)*
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

**Sub-processes:**
* **6.1 — Retrieve Proposal Details** — Extracts pending proposals and active histories from the database to present to evaluators.
* **6.2 — Process Chair Endorsement** — Evaluates the RET Chair's decision; on endorsement, writes an Endorsed Proposal Record to the datastore alongside status and feedback updates.
* **6.3 — Process Director Approval** — Evaluates and commits the Director's final approval decision based on the stored endorsement record, and triggers project activation prerequisites.

---

## **LEVEL 1 DFD — Process 7: Manage Projects**

* Director → 7.1 — Special Order Documents
* RET Chair → 7.1 — Special Order Documents
* Faculty → 7.1 — Special Order Documents
* D2 → 7.1 — Approved Proposal Record
* 7.1 → D4 — Special Order Records
* 7.1 → 7.2 — Validated Special Order Data

* Director → 7.2 — Activation Request
* Director → 7.2 — Selected MOA
* Director → 7.2 — Reporting Schedule
* D3 → 7.2 — Verified MOA Reference
* 7.1 → 7.2 — Validated Special Order Data
* 7.2 → Director — Active Project Status
* 7.2 → RET Chair — Active Project Status
* 7.2 → Faculty — Active Project Status
* 7.2 → D4 — New Active Project Record
* 7.2 → D4 — Active Project Context
* 7.2 → D4 — Project Reporting Schedule
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
* 7.4 → D4 — Flagged Project Record
* 7.4 → D6 — Project Event Data

* D3 → 7.5 — Verified MOA Reference
* D4 → 7.5 — Active Project Records (Linked MOA)  *(added — 7.5 previously had no way to identify which projects link to the renewed MOA)*
* 7.5 → D4 — Updated MOA Reference
* 7.5 → D4 — Cleared MOA Expired Flag  *(added — closes the loop with 7.4: without this, an expired-MOA flag could never be cleared once the MOA is renewed)*
* 7.5 → D6 — Project Event Data

* D4 → 7.6 — Project Reporting Schedule
* D5 → 7.6 — Submitted Report Records
* 7.6 → Faculty — Overdue Report Alert
* 7.6 → RET Chair — Overdue Report Alert
* 7.6 → D4 — Flagged Project Record
* 7.6 → D6 — Project Event Data

* D4 → 7.7 — Active Project Records
* 7.7 → D4 — Aggregated Project Data
* 7.7 → D4 — Project Records
* 7.7 → D4 — Linked Project Data

**Sub-processes:**
* **7.1 — Record Special Orders** — Stores mandatory Special Order legal documents against project member roles.
* **7.2 — Process Project Activation** — Validates MOA status and establishes active project records, schedules, and dependencies in the database.
* **7.3 — Process Project Update** — Reads project parameters from the projects datastore and commits update records and status changes.
* **7.4 — Monitor MOA Validity** — Temporal process that compares active project MOA metrics against validity dates to flag expiries.
* **7.5 — Update Linked MOA** — Retrieves active projects linked to the renewed MOA, re-links the updated reference, and clears the expired flag on each affected project.
* **7.6 — Monitor Report Deadlines** — Temporal process that evaluates actual report files against scheduled dates to issue delinquency flags.
* **7.7 — Update Project Metrics** — Prepares active project data structures for dashboard analytics retrieval.

---

## **LEVEL 1 DFD — Process 8: Manage Project Reports**

* Faculty → 8.1 — Progress Report Documents
* RET Chair → 8.1 — Progress Report Documents
* D4 → 8.1 — Active Project Context
* D4 → 8.1 — Project Reporting Schedule
* 8.1 → Faculty — Report Acknowledgment
* 8.1 → RET Chair — Report Acknowledgment
* 8.1 → D5 — Progress Report Record
* 8.1 → D5 — Project Report Metrics
* 8.1 → D6 — Report Event Data

* Faculty → 8.2 — Progress Report Documents
* Faculty → 8.2 — Overdue Report Response
* RET Chair → 8.2 — Progress Report Documents
* RET Chair → 8.2 — Overdue Report Response
* D4 → 8.2 — Active Project Context
* D4 → 8.2 — Project Reporting Schedule
* 8.2 → Faculty — Report Acknowledgment
* 8.2 → RET Chair — Report Acknowledgment
* 8.2 → D5 — Progress Report Record
* 8.2 → D5 — Project Report Metrics
* 8.2 → D4 — Cleared Report Overdue Flag  *(added — 8.2's own description already claimed this behavior; the flow was missing)*
* 8.2 → D6 — Report Event Data

* Faculty → 8.3 — Terminal Report
* Faculty → 8.3 — Final Accomplishment Report
* RET Chair → 8.3 — Terminal Report
* RET Chair → 8.3 — Final Accomplishment Report
* D4 → 8.3 — Active Project Context
* D4 → 8.3 — Project Reporting Schedule
* 8.3 → Faculty — Report Acknowledgment
* 8.3 → RET Chair — Report Acknowledgment
* 8.3 → D4 — Project Completion Status
* 8.3 → D5 — Terminal Report Record
* 8.3 → D5 — Final Accomplishment Report Record
* 8.3 → D5 — Project Report Metrics
* 8.3 → D6 — Report Event Data

* D5 → 8.4 — Submitted Report Records
* 8.4 → D5 — Project Report Metrics

**Sub-processes:**
* **8.1 — Process Progress Report** — Evaluates progress documents against active schedules, writes records to storage, and issues acknowledgments.
* **8.2 — Process Overdue Report** — Processes late report submissions, writes the record, and clears the project's delinquency flag in D4.
* **8.3 — Execute Project Closure** — Validates concurrent closure reports and transitions the active project record to closed.
* **8.4 — Update Report Metrics** — Aggregates final report statistics for dashboard querying.

---

## **LEVEL 1 DFD — Process 9: Manage Activity Logs**

* Super Admin → 9.1 — Audit Log Request
* D6 → 9.1 — Stored Audit Records  *(corrected — a data store cannot originate search/query parameters; D6 now correctly supplies the records being retrieved, not the request criteria)*
* 9.1 → 9.2 — Retrieved Log Details

* Super Admin → 9.2 — Filter And Search Parameters
* 9.1 → 9.2 — Retrieved Log Details
* 9.2 → Super Admin — System Audit Trail Data
* 9.2 → Super Admin — Filtered Log Results
* 9.2 → D6 — Audit Event Data

* D6 → 9.3 — System Event Records
* 9.3 → D6 — Audit Event Data

**Sub-processes:**
* **9.1 — Retrieve Baseline Log** — Interrogates the activity logs datastore to fetch historical audit records, using the Super Admin's request to scope retrieval.
* **9.2 — Generate Audit Trail** — Restructures retrieved log entries based on the Super Admin's filter parameters and logs access activity.
* **9.3 — Aggregate System Events** — Consolidates background events from all system processes into unified logs.

