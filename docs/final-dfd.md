# **NEUST-EPMS DATA FLOW DIAGRAM SPECIFICATION**
### **Extension Services Project Management System**
*Aligned with Dennis, Wixom, & Roth (Systems Analysis and Design, Chapter 5)* [1]

---

# **SYSTEM DATASTORES (LEVEL 1 & HIGHER ONLY)**
* **D1**: Users Datastore
* **D2**: Proposals Datastore
* **D3**: MOA Records Datastore
* **D4**: Projects Datastore
* **D5**: Project Reports Datastore
* **D6**: Activity Logs Datastore
* **D7**: Pending Verification Codes

---

# **CONTEXT DIAGRAM**

**Process 0:** Extension Services Project Management System

### **External Entities and System Interfaces**

#### **Super Admin**
* Super Admin → 0 — **Access Credentials**
* Super Admin → 0 — **User Management Requests**
* Super Admin → 0 — **Audit Request**
* 0 → Super Admin — **Access Response**
* 0 → Super Admin — **Account Status Notice**
* 0 → Super Admin — **Queried User Profiles**
* 0 → Super Admin — **System Audit Trail Logs**

#### **Director**
* Director → 0 — **Access Credentials**
* Director → 0 — **MOA Agreement Documents**
* Director → 0 — **Approved Evaluation Package**
* Director → 0 — **Project Directives**
* Director → 0 — **Dashboard Request**
* Director → 0 — **Overview Request**
* 0 → Director — **Access Response**
* 0 → Director — **Account Status Notice**
* 0 → Director — **MOA Verification Details**
* 0 → Director — **Proposal Review Documents**
* 0 → Director — **Active Project Status**
* 0 → Director — **Dashboard Metrics**

#### **RET Chair**
* RET Chair → 0 — **Access Credentials**
* RET Chair → 0 — **Roster Request**
* RET Chair → 0 — **Proposal Submissions**
* RET Chair → 0 — **Chair Evaluation Package**
* RET Chair → 0 — **Project Implementation Updates**
* RET Chair → 0 — **Report Submissions**
* RET Chair → 0 — **Dashboard Request**
* 0 → RET Chair — **Access Notifications**
* 0 → RET Chair — **Faculty Directory Notices**
* 0 → RET Chair — **Proposal Details**
* 0 → RET Chair — **Submission Acknowledgment**
* 0 → RET Chair — **Active Project Status**
* 0 → RET Chair — **Report Acknowledgment**
* 0 → RET Chair — **Dashboard Metrics**

#### **Faculty**
* Faculty → 0 — **Access Credentials**
* Faculty → 0 — **Proposal Submissions**
* Faculty → 0 — **Project Implementation Updates**
* Faculty → 0 — **Report Submissions**
* Faculty → 0 — **Dashboard Request**
* 0 → Faculty — **Access Notifications**
* 0 → Faculty — **Account Status Notice**
* 0 → Faculty — **Submission Acknowledgment**
* 0 → Faculty — **Proposal Status And Feedback**
* 0 → Faculty — **Active Project Status**
* 0 → Faculty — **Report Acknowledgment**
* 0 → Faculty — **Dashboard Metrics**

---

### **Combined Flow Definitions (Data Bundles)**
* **Access Credentials** = Login Credentials + Registration Details *(where applicable)* + Password Reset Request + Verification Code Submission + New Password Credentials
* **Access Response** = Access Authorization + Verification Code Notice
* **Access Notifications** = Access Authorization + Verification Code Notice + Account Status Notice
* **User Management Requests** = Account Management Request + Selected User ID + Role Assignment + Approval Decision + Rejection Decision + New User Profiles + User Search Request + User Query + Updated Role Assignment
* **Queried User Profiles** = Pending User Profiles + User Search Results + User Details
* **Audit Request** = Audit Log Request + Filter And Search Parameters
* **MOA Agreement Documents** = Partner MOA Document + Validity Terms + Updated Validity Dates + Selected MOA
* **MOA Verification Details** = MOA Status + Linked Project Records
* **Chair Evaluation Package** = Evaluation Decisions + Review Comments + Signed Endorsement Form Scan
* **Approved Evaluation Package** = Director Evaluation Decision + Approved Proposal Scan
* **Proposal Submissions** = Draft Proposal Documents + Special Order Documents + Revised Proposal Documents
* **Proposal Review Documents** = Proposal Details + Signed Endorsement Form Scan
* **Project Directives** = Activation Request + Selected MOA + Reporting Schedule + Project Implementation Updates + Closure Approval Decision
* **Project Implementation Updates** = Progress Scope Changes + Task Completion Updates
* **Report Submissions** = Progress Report Documents + Terminal Accomplishment Report + Evaluation Forms + Attendance Records *(where applicable)*
* **Dashboard Metrics** = Project Metrics + College Project Metrics *(where applicable)* + Faculty Activity Overview *(where applicable)*
* **Active Project Status** = Activation Notice + Implementation Status Notice + Closure Status Notice
* **Faculty Directory Notices** = Faculty Roster + Account Status Notice

---

# **LEVEL 0 DFD (NO DATA STORES PER OVERRIDE)**

### **Process 1.0 — Manage User Accounts**
* **Inputs:**
  * Super Admin → 1.0 — **User Management Requests**
  * RET Chair → 1.0 — **Roster Request**
  * 2.0 → 1.0 — **Pending User Record** *(Self-registration handoff)*
* **Outputs:**
  * **1.0 → 2.0 — Provisioned Account Records** *(Linear Backbone: 1.0 $\rightarrow$ 2.0)*
  * 1.0 → Super Admin — **Queried User Profiles**
  * 1.0 → Super Admin — **Account Status Notice**
  * 1.0 → Director — **Account Status Notice**
  * 1.0 → RET Chair — **Faculty Directory Notices**
  * 1.0 → Faculty — **Account Status Notice**
  * 1.0 → 8.0 — **Faculty List**

---

### **Process 2.0 — Manage System Access**
* **Inputs:**
  * Super Admin → 2.0 — **Access Credentials**
  * Director → 2.0 — **Access Credentials**
  * RET Chair → 2.0 — **Access Credentials**
  * Faculty → 2.0 — **Access Credentials**
  * **1.0 → 2.0 — Provisioned Account Records** *(From 1.0)*
* **Outputs:**
  * **2.0 → 3.0 — Authenticated User Context** *(Linear Backbone: 2.0 $\rightarrow$ 3.0)*
  * 2.0 → 1.0 — **Pending User Record** *(Parallel return loop)*
  * 2.0 → Super Admin — **Access Response**
  * 2.0 → Director — **Access Response**
  * 2.0 → RET Chair — **Access Notifications**
  * 2.0 → Faculty — **Access Notifications**

---

### **Process 3.0 — Manage Project Proposals**
* **Inputs:**
  * Faculty → 3.0 — **Proposal Submissions**
  * RET Chair → 3.0 — **Proposal Submissions**
  * **2.0 → 3.0 — Authenticated User Context** *(From 2.0)*
  * 4.0 → 3.0 — **Proposal Revision Notices** *(Parallel return loop)*
* **Outputs:**
  * **3.0 → 4.0 — Proposal Evaluation Package** *(Linear Backbone: 3.0 $\rightarrow$ 4.0)*
  * 3.0 → Faculty — **Submission Acknowledgment**
  * 3.0 → RET Chair — **Submission Acknowledgment**
  * 3.0 → 8.0 — **Proposal Records**

---

### **Process 4.0 — Evaluate Project Proposal**
* **Inputs:**
  * **3.0 → 4.0 — Proposal Evaluation Package** *(From 3.0)*
  * RET Chair → 4.0 — **Chair Evaluation Package**
  * Director → 4.0 — **Approved Evaluation Package**
* **Outputs:**
  * **4.0 → 5.0 — Approved Proposal Records** *(Linear Backbone: 4.0 $\rightarrow$ 5.0)*
  * 4.0 → 3.0 — **Proposal Revision Notices** *(Parallel return loop)*
  * 4.0 → RET Chair — **Proposal Details**
  * 4.0 → Director — **Proposal Review Documents**
  * 4.0 → Faculty — **Proposal Status And Feedback**

---

### **Process 5.0 — Manage MOA Records**
* **Inputs:**
  * **4.0 → 5.0 — Approved Proposal Records** *(From 4.0)*
  * Director → 5.0 — **MOA Agreement Documents**
  * Director → 5.0 — **Selected MOA**
  * 6.0 → 5.0 — **Linked Project Records** *(Parallel return loop)*
* **Outputs:**
  * **5.0 → 6.0 — Verified Project Package** *(Linear Backbone: 5.0 $\rightarrow$ 6.0)*
  * 5.0 → Director — **MOA Status**
  * 5.0 → Director — **MOA Verification Details**

---

### **Process 6.0 — Manage Projects**
* **Inputs:**
  * **5.0 → 6.0 — Verified Project Package** *(From 5.0)*
  * Director → 6.0 — **Project Directives**
  * RET Chair → 6.0 — **Project Implementation Updates**
  * Faculty → 6.0 — **Project Implementation Updates**
  * 7.0 → 6.0 — **Submitted Report Records** *(Parallel return loop)*
* **Outputs:**
  * **6.0 → 7.0 — Project Reporting Package** *(Linear Backbone: 6.0 $\rightarrow$ 7.0)*
  * 6.0 → 5.0 — **Linked Project Records** *(Parallel return loop)*
  * 6.0 → 8.0 — **Active Project Summary**
  * 6.0 → Director — **Active Project Status**
  * 6.0 → RET Chair — **Active Project Status**
  * 6.0 → Faculty — **Active Project Status**

---

### **Process 7.0 — Manage Project Reports**
* **Inputs:**
  * **6.0 → 7.0 — Project Reporting Package** *(From 6.0)*
  * Faculty → 7.0 — **Report Submissions**
  * RET Chair → 7.0 — **Report Submissions**
* **Outputs:**
  * **7.0 → 8.0 — Project Report Metrics** *(Linear Backbone: 7.0 $\rightarrow$ 8.0)*
  * 7.0 → 6.0 — **Submitted Report Records** *(Parallel return loop)*
  * 7.0 → Faculty — **Report Acknowledgment**
  * 7.0 → RET Chair — **Report Acknowledgment**

---

### **Process 8.0 — Monitor Dashboard**
* **Inputs:**
  * **7.0 → 8.0 — Project Report Metrics** *(From 7.0)*
  * 1.0 → 8.0 — **Faculty List**
  * 3.0 → 8.0 — **Proposal Records**
  * 6.0 → 8.0 — **Active Project Summary**
  * Director → 8.0 — **Dashboard Request**
  * Director → 8.0 — **Overview Request**
  * RET Chair → 8.0 — **Dashboard Request**
  * Faculty → 8.0 — **Dashboard Request**
* **Outputs:**
  * **8.0 → 9.0 — System Activity Logs** *(Linear Backbone: 8.0 $\rightarrow$ 9.0)*
  * 8.0 → Director — **Dashboard Metrics**
  * 8.0 → RET Chair — **Dashboard Metrics**
  * 8.0 → Faculty — **Dashboard Metrics**

---

### **Process 9.0 — Manage Activity Logs**
* **Inputs:**
  * **8.0 → 9.0 — System Activity Logs** *(From 8.0)*
  * Super Admin → 9.0 — **Audit Request**
* **Outputs:**
  * 9.0 → Super Admin — **System Audit Trail Logs**

---

# **LEVEL 1 DFDs**

## **LEVEL 1 DFD — Process 1.0: Manage User Accounts (5 Sub-Processes)**

* Super Admin → 1.1 — User Management Requests
* Super Admin → 1.1 — Selected User ID
* D1 → 1.1 — Pending User Records
* 1.1 → Super Admin — Pending User Profiles
* 1.1 → Super Admin — User Details
* 1.1 → 1.2 — Selected User Record

* Super Admin → 1.2 — Role Assignment
* Super Admin → 1.2 — Approval / Rejection Decision
* Super Admin → 1.2 — User Query
* Super Admin → 1.2 — Updated Role Assignment
* D1 → 1.2 — Existing User Record
* 1.1 → 1.2 — Selected User Record
* 1.2 → D1 — Activated / Rejected User Record
* 1.2 → D1 — Updated User Record
* 1.2 → 1.3 — Authorized Account Records

* 1.2 → 1.3 — Authorized Account Records
* 1.3 → Super Admin — Account Status Notice
* 1.3 → Director — Account Status Notice
* 1.3 → RET Chair — Account Status Notice
* 1.3 → Faculty — Account Status Notice
* 1.3 → D6 — User Management Event Logs

* RET Chair → 1.4 — Roster Request
* Super Admin → 1.4 — User Search Request
* D1 → 1.4 — Scope Parameters
* D1 → 1.4 — User Records
* 1.4 → RET Chair — Faculty Roster
* 1.4 → Super Admin — User Search Results

* Super Admin → 1.5 — New User Profiles
* Super Admin → 1.5 — Role Assignment
* 1.5 → D1 — Provisioned User Record
* 1.5 → Super Admin — Account Status Notice
* 1.5 → Director — Account Status Notice
* 1.5 → RET Chair — Account Status Notice
* 1.5 → Faculty — Account Status Notice
* 1.5 → D6 — User Management Event Logs

**Sub-processes:**
* **1.1 — Evaluate Pending Registrations** — Queries D1 to retrieve pending user registrations, processes the Super Admin's selection, and outputs profile details for review.
* **1.2 — Authorize User Profile** — Commits the Super Admin's approval, rejection, or role modification into D1, forwarding authorized account records for notification.
* **1.3 — Finalize Activation** — Dispatches account status notices to all affected actors and logs administrative actions in D6.
* **1.4 — Generate User Roster** — Filters user profiles from D1 according to RET Chair campus scope or Admin search parameters; outputs faculty rosters or search results.
* **1.5 — Provision Account** — Directly initializes and stores administrative and faculty user profiles in D1, issues activation notices, and logs account provisioning in D6.

---

## **LEVEL 1 DFD — Process 2.0: Manage System Access (4 Sub-Processes)**

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
* 2.1 → D6 — Access Event Logs

* RET Chair → 2.2 — Registration Details
* Faculty → 2.2 — Registration Details
* 2.2 → RET Chair — Account Status Notice
* 2.2 → Faculty — Account Status Notice
* 2.2 → D1 — Pending User Record
* 2.2 → D6 — Access Event Logs

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
* Super Admin → 2.4 — New Password Credentials
* Director → 2.4 — New Password Credentials
* RET Chair → 2.4 — New Password Credentials
* Faculty → 2.4 — New Password Credentials
* D7 → 2.4 — Verification Code Record
* 2.4 → D1 — Updated Password Record
* 2.4 → D7 — Invalidated Verification Code
* 2.4 → D6 — Access Event Logs

**Sub-processes:**
* **2.1 — Authenticate User** — Validates login credentials against authorized account records stored in D1, issuing access authorizations and logging authentication events in D6.
* **2.2 — Process Self-Registration** — Accepts initial self-registration details from applicants, creates a pending profile in D1, issues an acknowledgment notice, and logs the event in D6.
* **2.3 — Generate Reset Verification Code** — Confirms that an active account exists in D1, generates a temporary reset verification code, stores it in D7, and dispatches it to the user.
* **2.4 — Finalize Password Reset** — Validates the submitted code against D7; upon verification, updates the stored password in D1, marks the verification code invalid in D7, and logs the reset transaction in D6.

---

## **LEVEL 1 DFD — Process 3.0: Manage Project Proposals (4 Sub-Processes)**

* Faculty → 3.1 — Draft Proposal Documents
* RET Chair → 3.1 — Draft Proposal Documents
* Faculty → 3.1 — Special Order Documents
* RET Chair → 3.1 — Special Order Documents
* D2 → 3.1 — Existing Proposal State
* 3.1 → 3.2 — Verified Proposal Submission

* 3.1 → 3.2 — Verified Proposal Submission
* 3.2 → D2 — Pending Proposal Record
* 3.2 → D2 — Special Order Records
* 3.2 → D2 — Submission History
* 3.2 → 3.3 — Proposal Notification

* 3.2 → 3.3 — Proposal Notification
* 3.3 → Faculty — Submission Acknowledgment
* 3.3 → RET Chair — Submission Acknowledgment
* 3.3 → D6 — Proposal Event Logs

* Faculty → 3.4 — Revised Proposal Documents
* RET Chair → 3.4 — Revised Proposal Documents
* D2 → 3.4 — Updated Proposal Status
* D2 → 3.4 — Proposal Feedback Record
* 3.4 → Faculty — Submission Acknowledgment
* 3.4 → RET Chair — Submission Acknowledgment
* 3.4 → D2 — Pending Proposal Record
* 3.4 → D2 — Revised Proposal Record
* 3.4 → D6 — Proposal Event Logs

**Sub-processes:**
* **3.1 — Review Proposal Submission** — Checks submitted proposal documents and member special orders against D2 to verify structural completeness and prevent duplicate active submissions.
* **3.2 — Record Proposal Data** — Writes validated proposal submissions into D2 with an initial status of "pending review," stores member special order records, initializes the submission history, and prepares proposal records for evaluation.
* **3.3 — Route Proposal for Review** — Issues submission receipts to project leaders and logs proposal intake in D6.
* **3.4 — Process Proposal Resubmission** — Accepts revised documents for returned proposals, validates them against stored feedback in D2, updates the record status to "pending review," appends to the submission history, issues an acknowledgment, and logs the resubmission in D6.

---

## **LEVEL 1 DFD — Process 4.0: Evaluate Project Proposal (4 Sub-Processes)**

* D2 → 4.1 — Pending Proposal Record
* D2 → 4.1 — Submission History
* 4.1 → 4.2 — Retrieved Proposal Details

* 4.1 → 4.2 — Retrieved Proposal Details
* RET Chair → 4.2 — Evaluation Decisions
* RET Chair → 4.2 — Signed Endorsement Form Scan
* 4.2 → RET Chair — Proposal Details
* 4.2 → Faculty — Proposal Status And Feedback
* 4.2 → D2 — Endorsed Proposal Record
* 4.2 → D2 — Signed Endorsement Form Scan
* 4.2 → D2 — Updated Proposal Status
* 4.2 → D2 — Proposal Feedback Record
* 4.2 → D6 — Evaluation Event Logs

* D2 → 4.3 — Endorsed Proposal Record
* D2 → 4.3 — Signed Endorsement Form Scan
* Director → 4.3 — Evaluation Decisions
* 4.3 → Director — Proposal Details
* 4.3 → Faculty — Proposal Status And Feedback
* 4.3 → D2 — Director-Approved Proposal Record
* 4.3 → D2 — Updated Proposal Status
* 4.3 → D2 — Proposal Feedback Record
* 4.3 → D6 — Evaluation Event Logs

* Director → 4.4 — Approved Proposal Scan
* D2 → 4.4 — Director-Approved Proposal Record
* 4.4 → D2 — Institutionally Approved Proposal Record
* 4.4 → Faculty — Proposal Status And Feedback
* 4.4 → D6 — Evaluation Event Logs

**Sub-processes:**
* **4.1 — Retrieve Proposal Details** — Queries D2 for submitted proposals awaiting evaluation; extracts structural details and submission histories, routing all proposals uniformly into the Chair endorsement stage.
* **4.2 — Process Chair Endorsement** — Evaluates the RET Chair's endorsement decision for all proposals (including the Chair's own submissions); requires the upload of a verified endorsement form scan signed by the College Dean or Campus Director; writes the endorsed record, uploaded scan, status, and feedback into D2, notifying the project leader and logging the event in D6.
* **4.3 — Process Director Approval** — Presents endorsed proposals alongside the verified Dean/Director endorsement form scan to the Director for final executive review; records approval, return, or rejection decisions in D2, notifies the project leader, and logs the review in D6.
* **4.4 — Record Institutional Approval** — Receives the final signed institutional approval scan from the Director, updates the proposal state to "institutionally approved" in D2, alerts the project leader, and logs the sign-off in D6.

---

## **LEVEL 1 DFD — Process 5.0: Manage MOA Records (3 Sub-Processes)**

* Director → 5.1 — MOA Agreement Documents
* D2 → 5.1 — Approved Proposal Records
* D3 → 5.1 — Existing MOA Records
* 5.1 → Director — MOA Status
* 5.1 → D3 — Verified MOA Reference
* 5.1 → D3 — MOA Validity Dates
* 5.1 → D6 — MOA Event Logs

* Director → 5.2 — Updated Validity Dates
* D3 → 5.2 — Existing MOA Records
* 5.2 → Director — MOA Status
* 5.2 → D3 — Extended MOA Validity Dates
* 5.2 → D6 — MOA Event Logs

* Director → 5.3 — Selected MOA
* D3 → 5.3 — Verified MOA Reference
* D4 → 5.3 — Linked Project Records
* 5.3 → Director — MOA Verification Details

**Sub-processes:**
* **5.1 — Register Partner MOA** — Verifies institutional MOA documents against existing entries in D3 and approved proposals in D2, records new MOA references and validity dates, confirms registration status to the Director, and logs the event in D6.
* **5.2 — Extend MOA Validity** — Updates stored MOA validity timelines in D3 based on approved extensions or renewals submitted by the Director, confirming the updated status and logging the modification in D6.
* **5.3 — Track Linked Projects** — Reads active project linkages from D4 matching a selected MOA reference in D3, assembling and displaying verification details and project rosters for the Director.

---

## **LEVEL 1 DFD — Process 6.0: Manage Projects (5 Sub-Processes)**

* Director → 6.1 — Activation Request
* Director → 6.1 — Selected MOA
* Director → 6.1 — Reporting Schedule
* D2 → 6.1 — Institutionally Approved Proposal Record
* D2 → 6.1 — Special Order Records
* D3 → 6.1 — Verified MOA Reference
* 6.1 → Director — Active Project Status
* 6.1 → RET Chair — Active Project Status
* 6.1 → Faculty — Active Project Status
* 6.1 → D4 — New Active Project Record
* 6.1 → D4 — Active Project Context
* 6.1 → D4 — Project Reporting Milestones
* 6.1 → D4 — Project Special Order Records
* 6.1 → D4 — Linked Project Records
* 6.1 → D6 — Project Event Logs

* Director → 6.2 — Project Implementation Updates
* RET Chair → 6.2 — Project Implementation Updates
* Faculty → 6.2 — Project Implementation Updates
* D4 → 6.2 — Active Project Record
* 6.2 → Director — Active Project Status
* 6.2 → RET Chair — Active Project Status
* 6.2 → Faculty — Active Project Status
* 6.2 → D4 — Project Update Record
* 6.2 → D6 — Project Event Logs

* D3 → 6.3 — Verified MOA Reference
* D4 → 6.3 — Active Project Records
* 6.3 → D4 — Updated MOA Reference
* 6.3 → D6 — Project Event Logs

* D4 → 6.4 — Active Project Records
* 6.4 → D4 — Aggregated Project Summaries

* Director → 6.5 — Closure Approval Decision
* D4 → 6.5 — Pending Closure Project Records
* 6.5 → Director — Active Project Status
* 6.5 → RET Chair — Active Project Status
* 6.5 → Faculty — Active Project Status
* 6.5 → D4 — Closed Project Record
* 6.5 → D6 — Project Event Logs

**Sub-processes:**
* **6.1 — Process Project Activation** — Verifies institutional proposal approval from D2 and partner MOA validity from D3; creates the active project record, transfers special orders, establishes reporting milestones in D4, notifies project actors, and logs the activation in D6. *(Decomposed at Level 2 as 6.1.1, 6.1.2, 6.1.3).*
* **6.2 — Process Project Update** — Accepts implementation updates from project leaders or the Director, updates project records in D4, notifies stakeholders, and logs the event in D6.
* **6.3 — Update Linked MOA** — Re-links active projects in D4 to extended MOA references from D3, maintaining relational validity and logging the update in D6.
* **6.4 — Update Project Metrics** — Synthesizes active project statuses from D4 to refresh summary project statistics for dashboard queries.
* **6.5 — Approve Project Closure** — Evaluates projects flagged as "pending closure" in D4 upon receipt of closure reports and the Director's closure approval decision, transitions project status to "closed" in D4, notifies all stakeholders, and logs project closure in D6.

---

## **LEVEL 1 DFD — Process 7.0: Manage Project Reports (3 Sub-Processes)**

* Faculty → 7.1 — Progress Report Documents
* RET Chair → 7.1 — Progress Report Documents
* D4 → 7.1 — Active Project Context
* D4 → 7.1 — Project Reporting Milestones
* 7.1 → Faculty — Report Acknowledgment
* 7.1 → RET Chair — Report Acknowledgment
* 7.1 → D5 — Progress Report Record
* 7.1 → D5 — Submitted Report Records
* 7.1 → D6 — Report Event Logs

* Faculty → 7.2 — Terminal Accomplishment Report
* Faculty → 7.2 — Evaluation Forms
* Faculty → 7.2 — Attendance Records *(Optional)*
* RET Chair → 7.2 — Terminal Accomplishment Report
* RET Chair → 7.2 — Evaluation Forms
* RET Chair → 7.2 — Attendance Records *(Optional)*
* D4 → 7.2 — Active Project Context
* 7.2 → Faculty — Report Acknowledgment
* 7.2 → RET Chair — Report Acknowledgment
* 7.2 → D4 — Pending Closure Status
* 7.2 → D5 — Terminal Accomplishment Record
* 7.2 → D5 — Evaluation Form Records
* 7.2 → D5 — Attendance Records *(When submitted)*
* 7.2 → D5 — Submitted Report Records
* 7.2 → D6 — Report Event Logs

* D5 → 7.3 — Submitted Report Records
* 7.3 → D5 — Project Report Metrics

**Sub-processes:**
* **7.1 — Process Progress Report** — Validates submitted progress reports against active project reporting milestones in D4, commits report records to D5, issues an acknowledgment to the submitter, and logs the intake in D6.
* **7.2 — Finalize Project Closure** — Validates the concurrent submission of the unified Terminal Accomplishment Report, participant Evaluation Forms, and optional Attendance Records; commits all closure documents into D5, flags the project record in D4 as "pending closure" awaiting final Director sign-off, issues an acknowledgment receipt, and logs the closure submission in D6.
* **7.3 — Update Report Metrics** — Aggregates report submission counts and milestone compliance in D5 for dashboard reporting.

---

## **LEVEL 1 DFD — Process 8.0: Monitor Dashboard (3 Sub-Processes)**

* Director → 8.1 — Dashboard Request
* Director → 8.1 — Overview Request
* RET Chair → 8.1 — Dashboard Request
* Faculty → 8.1 — Dashboard Request
* 8.1 → 8.2 — Project Scope Parameters
* 8.1 → 8.3 — Faculty Scope Parameters

* 8.1 → 8.2 — Project Scope Parameters
* D2 → 8.2 — Proposal Records
* D4 → 8.2 — Active Project Records
* D5 → 8.2 — Project Report Metrics
* 8.2 → Director — Project Metrics
* 8.2 → RET Chair — Project Metrics
* 8.2 → RET Chair — College Project Metrics
* 8.2 → Faculty — Project Metrics
* 8.2 → D6 — Dashboard Event Logs

* 8.1 → 8.3 — Faculty Scope Parameters
* D1 → 8.3 — Faculty List
* D2 → 8.3 — Proposal Records
* D4 → 8.3 — Active Project Records
* 8.3 → Director — Faculty Activity Overview
* 8.3 → D6 — Dashboard Event Logs

**Sub-processes:**
* **8.1 — Configure Dashboard Scope** — Evaluates incoming dashboard requests, parsing user role and filter parameters into project and faculty scope criteria.
* **8.2 — Compile Project Metrics** — Queries proposal, active project, and report statistics from D2, D4, and D5 scoped to the requesting role; outputs summary project metrics to Director, RET Chair, and Faculty, logging dashboard queries in D6.
* **8.3 — Compile Faculty Overview** — Aggregates proposals and ongoing projects per faculty leader using D1, D2, and D4; outputs an institutional activity ranking to the Director and logs the query in D6.

---

## **LEVEL 1 DFD — Process 9.0: Manage Activity Logs (3 Sub-Processes)**

* Super Admin → 9.1 — Audit Request
* Super Admin → 9.1 — Filter And Search Parameters
* 9.1 → 9.2 — Audit Query Parameters

* 9.1 → 9.2 — Audit Query Parameters
* D6 → 9.2 — Stored Audit Records
* 9.2 → 9.3 — Filtered Audit Records

* 9.2 → 9.3 — Filtered Audit Records
* 9.3 → Super Admin — System Audit Trail Logs
* 9.3 → D6 — Audit Query Logs

**Sub-processes:**
* **9.1 — Configure Audit Query** — Accepts the Super Admin's audit request and search/filter parameters (date range, user, action type, module) and structures them into an audit query.
* **9.2 — Retrieve Audit Records** — Queries D6 to fetch historical system logs matching the specified parameters, forwarding the filtered records to report formatting.
* **9.3 — Generate Audit Reports** — Assembles the retrieved audit records into readable audit trails for the Super Admin, logging the audit query transaction in D6.

---

# **LEVEL 2 DFD**

## **LEVEL 2 DFD — Process 6.1: Process Project Activation (3 Sub-Processes)**

* Director → 6.1.1 — Activation Request
* D2 → 6.1.1 — Institutionally Approved Proposal Record
* D2 → 6.1.1 — Special Order Records
* 6.1.1 → 6.1.3 — Validated Activation Package
* 6.1.1 → D4 — Project Special Order Records

* Director → 6.1.2 — Reporting Schedule
* 6.1.2 → 6.1.3 — Project Reporting Milestones

* 6.1.1 → 6.1.3 — Validated Activation Package
* 6.1.2 → 6.1.3 — Project Reporting Milestones
* Director → 6.1.3 — Selected MOA
* D3 → 6.1.3 — Verified MOA Reference
* 6.1.3 → D4 — New Active Project Record
* 6.1.3 → D4 — Active Project Context
* 6.1.3 → D4 — Project Reporting Milestones
* 6.1.3 → D4 — Linked Project Records
* 6.1.3 → Director — Active Project Status
* 6.1.3 → RET Chair — Active Project Status
* 6.1.3 → Faculty — Active Project Status
* 6.1.3 → D6 — Project Event Logs

**Sub-processes:**
* **6.1.1 — Process Activation Request** — Confirms that the target proposal has attained institutional approval in D2, accepts the Director's activation command, writes member special orders into D4, and structures core activation parameters.
* **6.1.2 — Configure Reporting Schedule** — Translates the Director's reporting timeline into discrete calendar reporting milestones for project tracking.
* **6.1.3 — Create Active Project Record** — Combines activation parameters and reporting milestones with the validated partner MOA from D3 to create the active project record in D4, sets MOA linkage, dispatches active status notices to all stakeholders, and logs the activation transaction in D6.