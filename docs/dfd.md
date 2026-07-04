# CONTEXT DIAGRAM

**Process 0:** Extension Services Project Management System

**Super Admin**
- Super Admin → 0 — Access Data
- Super Admin → 0 — User Management Data
- Super Admin → 0 — Audit Query
- 0 → Super Admin — Access Response
- 0 → Super Admin — User Review Data
- 0 → Super Admin — Audit Reports

**Director**
- Director → 0 — Access Data
- Director → 0 — Dashboard Query
- Director → 0 — Overview Request
- Director → 0 — MOA Management Data
- Director → 0 — Evaluation Decision Data
- Director → 0 — Project Management Data
- 0 → Director — Access Response
- 0 → Director — Dashboard Metrics
- 0 → Director — MOA Review Data
- 0 → Director — Proposal Review Data
- 0 → Director — Project Status Data

**RET Chair**
- RET Chair → 0 — Access Data
- RET Chair → 0 — Roster Request
- RET Chair → 0 — Dashboard Query
- RET Chair → 0 — Proposal Submissions
- RET Chair → 0 — Evaluation Decision Data
- RET Chair → 0 — Project Updates
- RET Chair → 0 — Report Submissions
- 0 → RET Chair — Access Response
- 0 → RET Chair — Faculty Roster
- 0 → RET Chair — Dashboard Metrics
- 0 → RET Chair — Proposal Status Data
- 0 → RET Chair — Project Status Data
- 0 → RET Chair — Report Acknowledgment

**Faculty**
- Faculty → 0 — Access Data
- Faculty → 0 — Dashboard Query
- Faculty → 0 — Proposal Submissions
- Faculty → 0 — Project Updates
- Faculty → 0 — Report Submissions
- 0 → Faculty — Access Response
- 0 → Faculty — Dashboard Metrics
- 0 → Faculty — Proposal Status Data
- 0 → Faculty — Project Status Data
- 0 → Faculty — Report Acknowledgment

**Combined flow definitions:**
- Access Data = Access Credentials + Registration Details + Password Reset Request + OTP Submission + New Password Data
- Access Response = Access Authorization + Account Status Notice + OTP Notice
- User Management Data = Account Management Request + Selected User ID + Role Assignment + Approval / Rejection Decision + New User Data + Merge Decision + User Query
- User Review Data = Pending User Records + User Details + Duplicate Alert
- Audit Query = Audit Log Request + Filter And Search Parameters
- Audit Reports = Filtered Log Results + System Audit Trail Data
- MOA Management Data = MOA Files And Validity Dates + Updated Validity Dates + Selected MOA
- MOA Review Data = MOA Status + Linked Project List
- Evaluation Decision Data = Approval Decision + Evaluation Decision And Comments + Return Or Rejection Decision
- Proposal Submissions = Proposal Documents + Revised Proposal Documents
- Proposal Review Data = Proposal Details
- Proposal Status Data = Submission Acknowledgment + Proposal Details + Proposal Status And Feedback
- Project Management Data = Project Implementation Updates + Activation Request + Selected MOA + Reporting Schedule + Special Order Documents
- Project Updates = Project Implementation Updates + Special Order Documents
- Project Status Data = Active Project Status + MOA Expiry Alert + Overdue Report Alert
- Dashboard Metrics = Project Metrics + Faculty Activity Overview + College Project Metrics
- Report Submissions = Progress Report Documents + Terminal Report + Final Accomplishment Report

---

# LEVEL 0 DFD

**Process 1 — Manage User Accounts**
Super Admin → 1 — Account Management Request
Super Admin → 1 — Selected User ID
Super Admin → 1 — Role Assignment
Super Admin → 1 — Approval / Rejection Decision
Super Admin → 1 — New User Data
Super Admin → 1 — Merge Decision
Super Admin → 1 — User Query
RET Chair → 1 — Roster Request
2 → 1 — Pending User Record
1 → Super Admin — Pending User Records
1 → Super Admin — User Details
1 → Super Admin — Duplicate Alert
1 → RET Chair — Faculty Roster
1 → Super Admin — Account Status Notice
1 → Director — Account Status Notice
1 → RET Chair — Account Status Notice
1 → Faculty — Account Status Notice
1 → 2 — Activated / Rejected User Record
1 → 2 — Provisioned / Updated User Record
1 → 9 — User Management Event Data

**Process 2 — Manage System Access**
Super Admin → 2 — Access Credentials
Super Admin → 2 — Password Reset Request
Super Admin → 2 — OTP Submission
Super Admin → 2 — New Password Data
Director → 2 — Access Credentials
Director → 2 — Password Reset Request
Director → 2 — OTP Submission
Director → 2 — New Password Data
RET Chair → 2 — Access Credentials
RET Chair → 2 — Registration Details
RET Chair → 2 — Password Reset Request
RET Chair → 2 — OTP Submission
RET Chair → 2 — New Password Data
Faculty → 2 — Access Credentials
Faculty → 2 — Registration Details
Faculty → 2 — Password Reset Request
Faculty → 2 — OTP Submission
Faculty → 2 — New Password Data
1 → 2 — Activated / Rejected User Record
1 → 2 — Provisioned / Updated User Record
2 → Super Admin — Access Authorization
2 → Super Admin — OTP Notice
2 → Director — Access Authorization
2 → Director — OTP Notice
2 → RET Chair — Access Authorization
2 → RET Chair — OTP Notice
2 → RET Chair — Account Status Notice
2 → Faculty — Access Authorization
2 → Faculty — OTP Notice
2 → Faculty — Account Status Notice
2 → 1 — Pending User Record
2 → 9 — Access Event Data

**Process 3 — Monitor Dashboard**
Director → 3 — Dashboard Query
Director → 3 — Overview Request
RET Chair → 3 — Dashboard Query
Faculty → 3 — Dashboard Query
4 → 3 — Proposal Records
7 → 3 — Aggregated Project Data
7 → 3 — Project Records
8 → 3 — Project Report Metrics
3 → Director — Faculty Activity Overview
3 → Director — Project Metrics
3 → RET Chair — College Project Metrics
3 → RET Chair — Project Metrics
3 → Faculty — Project Metrics

**Process 4 — Manage Project Proposals**
RET Chair → 4 — Proposal Documents
RET Chair → 4 — Revised Proposal Documents
Faculty → 4 — Proposal Documents
Faculty → 4 — Revised Proposal Documents
6 → 4 — Proposal Status And Feedback
6 → 4 — Updated Proposal Status
4 → RET Chair — Submission Acknowledgment
4 → Faculty — Submission Acknowledgment
4 → 6 — Pending Proposal Record
4 → 6 — Submission History
4 → 6 — Existing Proposal State
4 → 3 — Proposal Records
4 → 9 — Proposal Event Data

**Process 5 — Manage MOA Records**
Director → 5 — MOA Files And Validity Dates
Director → 5 — Updated Validity Dates
Director → 5 — Selected MOA
7 → 5 — Linked Project Data
5 → Director — MOA Status
5 → Director — Linked Project List
5 → 7 — Verified MOA Reference
5 → 7 — MOA Validity Dates
5 → 9 — MOA Event Data

**Process 6 — Evaluate Project Proposal**
RET Chair → 6 — Evaluation Decision And Comments
RET Chair → 6 — Return Or Rejection Decision
Director → 6 — Approval Decision
Director → 6 — Return Or Rejection Decision
4 → 6 — Pending Proposal Record
4 → 6 — Submission History
4 → 6 — Existing Proposal State
6 → RET Chair — Proposal Details
6 → Director — Proposal Details
6 → Faculty — Proposal Status And Feedback
6 → 4 — Proposal Status And Feedback
6 → 4 — Updated Proposal Status
6 → 7 — Approved Proposal Record
6 → 9 — Evaluation Event Data

**Process 7 — Manage Projects**
Director → 7 — Activation Request
Director → 7 — Selected MOA
Director → 7 — Reporting Schedule
Director → 7 — Special Order Documents
Director → 7 — Project Implementation Updates
RET Chair → 7 — Special Order Documents
RET Chair → 7 — Project Implementation Updates
Faculty → 7 — Special Order Documents
Faculty → 7 — Project Implementation Updates
5 → 7 — Verified MOA Reference
5 → 7 — MOA Validity Dates
6 → 7 — Approved Proposal Record
8 → 7 — Submitted Report Records
7 → Director — Active Project Status
7 → Director — MOA Expiry Alert
7 → RET Chair — Active Project Status
7 → RET Chair — Overdue Report Alert
7 → Faculty — Active Project Status
7 → Faculty — Overdue Report Alert
7 → 5 — Linked Project Data
7 → 3 — Aggregated Project Data
7 → 3 — Project Records
7 → 8 — Active Project Context
7 → 8 — Project Reporting Schedule
7 → 9 — Project Event Data

**Process 8 — Manage Project Reports**
RET Chair → 8 — Progress Report Documents
RET Chair → 8 — Terminal Report
RET Chair → 8 — Final Accomplishment Report
Faculty → 8 — Progress Report Documents
Faculty → 8 — Terminal Report
Faculty → 8 — Final Accomplishment Report
7 → 8 — Active Project Context
7 → 8 — Project Reporting Schedule
8 → RET Chair — Report Acknowledgment
8 → Faculty — Report Acknowledgment
8 → 7 — Submitted Report Records
8 → 3 — Project Report Metrics
8 → 9 — Report Event Data

**Process 9 — Manage Activity Logs**
Super Admin → 9 — Audit Log Request
Super Admin → 9 — Filter And Search Parameters
1 → 9 — User Management Event Data
2 → 9 — Access Event Data
4 → 9 — Proposal Event Data
5 → 9 — MOA Event Data
6 → 9 — Evaluation Event Data
7 → 9 — Project Event Data
8 → 9 — Report Event Data
9 → Super Admin — System Audit Trail Data
9 → Super Admin — Filtered Log Results

---

# LEVEL 1 DFDs

**LEVEL 1 DFD — Process 1: Manage User Accounts**

Super Admin → 1.1 — Account Management Request
Super Admin → 1.1 — Selected User ID
Super Admin → 1.1 — Role Assignment
Super Admin → 1.1 — Approval / Rejection Decision
Super Admin → 1.1 — Merge Decision
D1 → 1.1 — Pending User Records
1.1 → Super Admin — Pending User Records
1.1 → Super Admin — User Details
1.1 → Super Admin — Duplicate Alert
1.1 → Faculty — Account Status Notice
1.1 → RET Chair — Account Status Notice
1.1 → D1 — Activated / Rejected User Record
1.1 → D6 — User Management Event Data

Super Admin → 1.2 — New User Data
Super Admin → 1.2 — Role Assignment
1.2 → Director — Account Status Notice
1.2 → Super Admin — Account Status Notice
1.2 → D1 — Provisioned / Updated User Record
1.2 → D6 — User Management Event Data

Super Admin → 1.3 — User Query
Super Admin → 1.3 — Role Assignment
D1 → 1.3 — Existing User Record
1.3 → Super Admin — Account Status Notice
1.3 → Director — Account Status Notice
1.3 → RET Chair — Account Status Notice
1.3 → Faculty — Account Status Notice
1.3 → D1 — Provisioned / Updated User Record
1.3 → D6 — User Management Event Data

RET Chair → 1.4 — Roster Request
D1 → 1.4 — Scoped User Records
1.4 → RET Chair — Faculty Roster

Sub-processes:
- 1.1 — **Process Pending Account** — Evaluates pending accounts, assigns roles, determines approval/rejection or merge outcomes, and activates user records.
- 1.2 — **Provision Director/Admin Profile** — Directly creates and provisions new user profiles for Directors and Super Admins.
- 1.3 — **Update Existing Role** — Retrieves existing active users and applies updated role assignments.
- 1.4 — **Generate Faculty Roster** — Retrieves faculty accounts based on the RET Chair's department or campus scope.

---

**LEVEL 1 DFD — Process 2: Manage System Access**

Super Admin → 2.1 — Access Credentials
Director → 2.1 — Access Credentials
RET Chair → 2.1 — Access Credentials
Faculty → 2.1 — Access Credentials
D1 → 2.1 — Stored Credentials
D1 → 2.1 — Existing User Profile
2.1 → Super Admin — Access Authorization
2.1 → Director — Access Authorization
2.1 → RET Chair — Access Authorization
2.1 → Faculty — Access Authorization
2.1 → D6 — Access Event Data

RET Chair → 2.2 — Registration Details
Faculty → 2.2 — Registration Details
2.2 → RET Chair — Account Status Notice
2.2 → Faculty — Account Status Notice
2.2 → D1 — Pending User Record
2.2 → D6 — Access Event Data

Super Admin → 2.3 — Password Reset Request
Super Admin → 2.3 — OTP Submission
Super Admin → 2.3 — New Password Data
Director → 2.3 — Password Reset Request
Director → 2.3 — OTP Submission
Director → 2.3 — New Password Data
RET Chair → 2.3 — Password Reset Request
RET Chair → 2.3 — OTP Submission
RET Chair → 2.3 — New Password Data
Faculty → 2.3 — Password Reset Request
Faculty → 2.3 — OTP Submission
Faculty → 2.3 — New Password Data
D1 → 2.3 — Existing User Profile
D7 → 2.3 — OTP Record
2.3 → Super Admin — OTP Notice
2.3 → Director — OTP Notice
2.3 → RET Chair — OTP Notice
2.3 → Faculty — OTP Notice
2.3 → D1 — Updated Password Record
2.3 → D7 — OTP Record
2.3 → D7 — Invalidated OTP Record
2.3 → D6 — Access Event Data

Sub-processes:
- 2.1 — **Validate Login Credentials** — Validates user credentials against the database and grants access authorization.
- 2.2 — **Process Self-Registration** — Records new registration requests as pending and notifies the user.
- 2.3 — **Process Password Reset** — Validates email, generates/verifies OTPs, and executes password updates.

---

**LEVEL 1 DFD — Process 3: Monitor Dashboard**

Director → 3.1 — Dashboard Query
RET Chair → 3.1 — Dashboard Query
Faculty → 3.1 — Dashboard Query
D2 → 3.1 — Proposal Records
D4 → 3.1 — Aggregated Project Data
D4 → 3.1 — Project Records
D5 → 3.1 — Project Report Metrics
3.1 → Director — Project Metrics
3.1 → RET Chair — Project Metrics
3.1 → RET Chair — College Project Metrics
3.1 → Faculty — Project Metrics

Director → 3.2 — Overview Request
D1 → 3.2 — Faculty List
D2 → 3.2 — Proposal Records
D4 → 3.2 — Project Records
3.2 → Director — Faculty Activity Overview

Sub-processes:
- 3.1 — **Compile Dashboard Metrics** — Retrieves and compiles aggregated project and proposal data to generate role-specific dashboard metrics.
- 3.2 — **Generate Faculty Overview** — Compiles system-wide proposal and project counts by project leader to generate the faculty activity ranking.

---

**LEVEL 1 DFD — Process 4: Manage Project Proposals**

Faculty → 4.1 — Proposal Documents
RET Chair → 4.1 — Proposal Documents
D2 → 4.1 — Existing Proposal State
4.1 → Faculty — Submission Acknowledgment
4.1 → RET Chair — Submission Acknowledgment
4.1 → D2 — Pending Proposal Record
4.1 → D2 — Validated Proposal Data
4.1 → D6 — Proposal Event Data

Faculty → 4.2 — Revised Proposal Documents
RET Chair → 4.2 — Revised Proposal Documents
D2 → 4.2 — Existing Proposal State
D2 → 4.2 — Proposal Status And Feedback
D2 → 4.2 — Submission History
4.2 → Faculty — Submission Acknowledgment
4.2 → RET Chair — Submission Acknowledgment
4.2 → D2 — Pending Proposal Record
4.2 → D2 — Revised Proposal Record
4.2 → D6 — Proposal Event Data

Sub-processes:
- 4.1 — **Submit New Proposal** — Validates and records a newly submitted proposal and routes it for review.
- 4.2 — **Process Proposal Resubmission** — Validates revised documents against prior feedback and submission history, then routes to the appropriate review stage.

---

**LEVEL 1 DFD — Process 5: Manage MOA Records**

Director → 5.1 — MOA Files And Validity Dates
D3 → 5.1 — Existing MOA Records
5.1 → Director — MOA Status
5.1 → D3 — Reviewed MOA Data
5.1 → D3 — Verified MOA Reference
5.1 → D6 — MOA Event Data

Director → 5.2 — Updated Validity Dates
D3 → 5.2 — Existing MOA Records
5.2 → Director — MOA Status
5.2 → D3 — Updated MOA Record
5.2 → D3 — Verified MOA Reference
5.2 → D6 — MOA Event Data

Director → 5.3 — Selected MOA
D4 → 5.3 — Linked Project Data
5.3 → Director — Linked Project List

Sub-processes:
- 5.1 — **Record New MOA** — Validates and stores a new master legal agreement and its validity dates.
- 5.2 — **Update Existing MOA** — Modifies the validity dates of an existing MOA record.
- 5.3 — **Review Linked Projects** — Retrieves and presents a list of all active projects linked to a specific MOA.

---

**LEVEL 1 DFD — Process 6: Evaluate Project Proposal**

RET Chair → 6.1 — Evaluation Decision And Comments
RET Chair → 6.1 — Return Or Rejection Decision
D2 → 6.1 — Pending Proposal Record
D2 → 6.1 — Submission History
6.1 → RET Chair — Proposal Details
6.1 → Faculty — Proposal Status And Feedback
6.1 → D2 — Updated Proposal Status
6.1 → D2 — Endorsed Proposal Record
6.1 → D2 — Proposal Feedback Record
6.1 → D6 — Evaluation Event Data

Director → 6.2 — Approval Decision
Director → 6.2 — Return Or Rejection Decision
D2 → 6.2 — Endorsed Proposal Record
D2 → 6.2 — Submission History
6.2 → Director — Proposal Details
6.2 → Faculty — Proposal Status And Feedback
6.2 → D2 — Updated Proposal Status
6.2 → D2 — Approved Proposal Record
6.2 → D2 — Proposal Feedback Record
6.2 → D6 — Evaluation Event Data

Sub-processes:
- 6.1 — **Process Chair Endorsement** — Processes the RET Chair's evaluation decision, stores feedback, and transitions the proposal to endorsed status.
- 6.2 — **Process Director Approval** — Processes the Director's approval decision, stores feedback, and finalizes the proposal as an approved project record.

---

**LEVEL 1 DFD — Process 7: Manage Projects**

Director → 7.1 — Special Order Documents
RET Chair → 7.1 — Special Order Documents
Faculty → 7.1 — Special Order Documents
D2 → 7.1 — Approved Proposal Record
7.1 → D4 — Special Order Records
7.1 → D6 — Project Event Data

Director → 7.2 — Activation Request
Director → 7.2 — Selected MOA
Director → 7.2 — Reporting Schedule
D4 → 7.2 — Special Order Records
D3 → 7.2 — Verified MOA Reference
7.2 → Director — Active Project Status
7.2 → RET Chair — Active Project Status
7.2 → Faculty — Active Project Status
7.2 → D4 — New Active Project Record
7.2 → D4 — Active Project Context
7.2 → D4 — Project Reporting Schedule
7.2 → D6 — Project Event Data

Director → 7.3 — Project Implementation Updates
RET Chair → 7.3 — Project Implementation Updates
Faculty → 7.3 — Project Implementation Updates
D4 → 7.3 — Active Project Record
7.3 → Director — Active Project Status
7.3 → RET Chair — Active Project Status
7.3 → Faculty — Active Project Status
7.3 → D4 — Project Update Record
7.3 → D6 — Project Event Data

D4 → 7.4 — Active Project Records
D3 → 7.4 — MOA Validity Dates
7.4 → Director — MOA Expiry Alert
7.4 → D4 — Flagged Project Record
7.4 → D6 — Project Event Data

D3 → 7.5 — Verified MOA Reference
D4 → 7.5 — Active Project Records
7.5 → D4 — Updated MOA Reference
7.5 → D6 — Project Event Data

D4 → 7.6 — Project Reporting Schedule
D5 → 7.6 — Submitted Report Records
7.6 → Faculty — Overdue Report Alert
7.6 → RET Chair — Overdue Report Alert
7.6 → D4 — Flagged Project Record
7.6 → D6 — Project Event Data

Sub-processes:
- 7.1 — **Record Special Orders** — Validates and stores Special Order documents against the approved proposal member list.
- 7.2 — **Activate Project** — Establishes the active project record, links the MOA, and formalizes the reporting schedule.
- 7.3 — **Record Project Updates** — Stores routine implementation updates and modifies the active project status.
- 7.4 — **Monitor MOA Validity** — Temporal process that evaluates project MOAs against validity dates and issues expiry alerts.
- 7.5 — **Update Linked MOA** — Synchronizes active projects when a renewed or updated MOA is recorded.
- 7.6 — **Monitor Report Deadlines** — Temporal process that evaluates submitted reports against the project schedule and flags overdue requirements.

---

**LEVEL 1 DFD — Process 8: Manage Project Reports**

Faculty → 8.1 — Progress Report Documents
RET Chair → 8.1 — Progress Report Documents
D4 → 8.1 — Active Project Context
D4 → 8.1 — Project Reporting Schedule
8.1 → Faculty — Report Acknowledgment
8.1 → RET Chair — Report Acknowledgment
8.1 → D5 — Progress Report Record
8.1 → D6 — Report Event Data

Faculty → 8.2 — Terminal Report
Faculty → 8.2 — Final Accomplishment Report
RET Chair → 8.2 — Terminal Report
RET Chair → 8.2 — Final Accomplishment Report
D4 → 8.2 — Active Project Context
D4 → 8.2 — Project Reporting Schedule
8.2 → Faculty — Report Acknowledgment
8.2 → RET Chair — Report Acknowledgment
8.2 → D4 — Project Completion Status
8.2 → D5 — Terminal Report Record
8.2 → D5 — Final Accomplishment Report Record
8.2 → D6 — Report Event Data

D5 → 8.3 — Submitted Report Records
8.3 → D5 — Project Report Metrics

Sub-processes:
- 8.1 — **Process Progress Report** — Validates and stores interim progress reports against the project schedule.
- 8.2 — **Execute Project Closure** — Validates simultaneous submission of Terminal and Final Accomplishment reports and triggers the project closure state.
- 8.3 — **Update Report Metrics** — Aggregates report submission data for dashboard retrieval.

---

**LEVEL 1 DFD — Process 9: Manage Activity Logs**

D6 → 9.1 — User Management Event Data
D6 → 9.1 — Access Event Data
D6 → 9.1 — Proposal Event Data
D6 → 9.1 — MOA Event Data
D6 → 9.1 — Evaluation Event Data
D6 → 9.1 — Project Event Data
D6 → 9.1 — Report Event Data
9.1 → D6 — Audit Event Data

Super Admin → 9.2 — Audit Log Request
Super Admin → 9.2 — Filter And Search Parameters
D6 → 9.2 — Audit Log Query
D6 → 9.2 — Filtered Audit Log Query
9.2 → Super Admin — System Audit Trail Data
9.2 → Super Admin — Filtered Log Results

Sub-processes:
- 9.1 — **Aggregate System Events** — Retrieves discrete event payloads and commits immutable audit records.
- 9.2 — **Generate Audit Trail** — Applies admin filtering parameters to extract and present requested system logs.