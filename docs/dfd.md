# CONTEXT DIAGRAM

**Process 0:** NEUST Extension Services Project Management System

**Super Admin**
- Super Admin → 0 — Access Data
- Super Admin → 0 — User Role Assignments
- Super Admin → 0 — Audit Query
- 0 → Super Admin — User Roster Data
- 0 → Super Admin — Access Response
- 0 → Super Admin — Account Status
- 0 → Super Admin — Audit Reports

**Director**
- Director → 0 — Access Data
- Director → 0 — MOA Files & Validity Dates
- Director → 0 — Project Management Data
- Director → 0 — Dashboard Query
- 0 → Director — Access Response
- 0 → Director — Account Status
- 0 → Director — MOA Status
- 0 → Director — Project Status Data
- 0 → Director — MOA Expiry Alert

**RET Chair**
- RET Chair → 0 — Access Data
- RET Chair → 0 — Project Documents
- RET Chair → 0 — Project Management Data
- RET Chair → 0 — Dashboard Query
- 0 → RET Chair — Access Response
- 0 → RET Chair — Account Status
- 0 → RET Chair — College User Roster Data
- 0 → RET Chair — Project Status Data
- 0 → RET Chair — Overdue Report Alert

**Faculty**
- Faculty → 0 — Access Data
- Faculty → 0 — Project Documents
- Faculty → 0 — Dashboard Query
- 0 → Faculty — Access Response
- 0 → Faculty — Account Status
- 0 → Faculty — Project Status Data
- 0 → Faculty — Overdue Report Alert

**Combined flow definitions:**
- Access Data = Access Credentials + Self-Registration Details + Password Reset Request + OTP Submission + New Password Data
- Access Response = Access Authorization + OTP
- Audit Query = Audit Log Request + Filter/Search Parameters
- Audit Reports = System Audit Trail Data + Filtered Log Results
- Project Management Data = Project Implementation Updates + Reporting Frequency + Reporting Dates + Approval Review Request + Approval Decision + Special Order Documents + Activate Project Request
- Project Documents = Proposal Documents + Progress Report Documents + Terminal Report + Final Accomplishment Report + Special Order Documents
- Project Status Data = Proposal Status & Feedback + Evaluation Status + Active Project Status + Submission Acknowledgment + Report Acknowledgment + Project Metrics + College Project Metrics + Review Assignment

---

# LEVEL 0 DFD

**Process 1.0 — Manage User Accounts**
Super Admin → 1.0 — User Role Assignments
2.0 → 1.0 — Pending User Record
1.0 → Super Admin — User Roster Data
1.0 → Director — Account Status
1.0 → RET Chair — College User Roster Data
1.0 → Faculty — Account Status
1.0 → RET Chair — Account Status
1.0 → Super Admin — Account Status
1.0 → 2.0 — Provisioned User Profile
1.0 → 9.0 — User Management Event

**Process 2.0 — Manage System Access**
Super Admin → 2.0 — Access Data
Director → 2.0 — Access Data
RET Chair → 2.0 — Access Data
Faculty → 2.0 — Access Data
1.0 → 2.0 — Provisioned User Profile
2.0 → Super Admin — Access Authorization
2.0 → Director — Access Authorization
2.0 → RET Chair — Access Authorization
2.0 → Faculty — Access Authorization
2.0 → Super Admin — OTP
2.0 → Director — OTP
2.0 → RET Chair — OTP
2.0 → Faculty — OTP
2.0 → Faculty — Account Status
2.0 → RET Chair — Account Status
2.0 → 1.0 — Pending User Record
2.0 → 9.0 — Access Event

**Process 3.0 — Monitor Dashboard**
Director → 3.0 — Dashboard Query
RET Chair → 3.0 — Dashboard Query
Faculty → 3.0 — Dashboard Query
7.0 → 3.0 — Aggregated Project Data
8.0 → 3.0 — Project Report Metrics
3.0 → Director — Project Metrics
3.0 → RET Chair — College Project Metrics
3.0 → Faculty — Project Metrics

**Process 4.0 — Manage Project Proposals**
Faculty → 4.0 — Proposal Documents
RET Chair → 4.0 — Proposal Documents
4.0 → Faculty — Submission Acknowledgment
4.0 → RET Chair — Submission Acknowledgment
4.0 → 3.0 — Proposal Metrics
4.0 → 6.0 — Pending Proposal Record
4.0 → 9.0 — Proposal Event

**Process 5.0 — Manage MOA Records**
Director → 5.0 — MOA Files & Validity Dates
5.0 → Director — MOA Status
5.0 → 6.0 — Verified MOA Record
5.0 → 7.0 — Verified MOA Record
5.0 → 9.0 — MOA Event

**Process 6.0 — Evaluate Project Proposal**
RET Chair → 6.0 — Evaluation Decision & Comments
Director → 6.0 — Evaluation Decision & Comments
Director → 6.0 — Approval Review Request
Director → 6.0 — Approval Decision
4.0 → 6.0 — Pending Proposal Record
5.0 → 6.0 — Verified MOA Record
6.0 → Faculty — Proposal Status & Feedback
6.0 → RET Chair — Proposal Status & Feedback
6.0 → Director — Proposal Status & Feedback
6.0 → Director — Available MOA List
6.0 → RET Chair — Evaluation Status
6.0 → Director — Evaluation Status
6.0 → RET Chair — Review Assignment
6.0 → 3.0 — Evaluation Metrics
6.0 → 4.0 — Proposal Status & Feedback
6.0 → 7.0 — Approved Proposal Record
6.0 → 9.0 — Evaluation Event

**Process 7.0 — Manage Projects**
Director → 7.0 — Special Order Documents
Director → 7.0 — Activate Project Request
Director → 7.0 — Project Implementation Updates
Director → 7.0 — Reporting Frequency
Director → 7.0 — Reporting Dates
RET Chair → 7.0 — Special Order Documents
RET Chair → 7.0 — Project Updates
RET Chair → 7.0 — Schedule Adjustment Request
Faculty → 7.0 — Special Order Documents
6.0 → 7.0 — Approved Proposal Record
5.0 → 7.0 — Verified MOA Record
7.0 → Director — Active Project Status
7.0 → Director — MOA Expiry Alert
7.0 → Faculty — Active Project Status
7.0 → RET Chair — Active Project Status
7.0 → Faculty — Overdue Report Alert
7.0 → RET Chair — Overdue Report Alert
7.0 → 3.0 — Aggregated Project Data
7.0 → 8.0 — Overdue Report Alert
7.0 → 9.0 — Project Event

**Process 8.0 — Manage Project Reports**
Faculty → 8.0 — Project Report Documents
RET Chair → 8.0 — Project Report Documents
7.0 → 8.0 — Overdue Report Alert
8.0 → Faculty — Report Acknowledgment
8.0 → RET Chair — Report Acknowledgment
8.0 → 3.0 — Project Report Metrics
8.0 → 9.0 — Report Event

**Process 9.0 — Manage Activity Logs**
Super Admin → 9.0 — Audit Log Request
Super Admin → 9.0 — Filter/Search Parameters
1.0 → 9.0 — User Management Event
2.0 → 9.0 — Access Event
4.0 → 9.0 — Proposal Event
5.0 → 9.0 — MOA Event
6.0 → 9.0 — Evaluation Event
7.0 → 9.0 — Project Event
8.0 → 9.0 — Report Event
9.0 → Super Admin — System Audit Trail Data
9.0 → Super Admin — Filtered Log Results

---

# LEVEL 1 DFDs

**LEVEL 1 DFD — Process 1.0: Manage User Accounts**

D1 → 1.1 — Pending User Records
Super Admin → 1.1 — Approval Decision
1.1 → 1.2 — Approved User Data
1.1 → Faculty — Account Status
1.1 → RET Chair — Account Status
1.1 → Director — Account Status
1.1 → Super Admin — Account Status
1.1 → 1.6 — User Management Event Data
Super Admin → 1.2 — User Role Assignments
1.2 → D1 — Role Assignment
1.2 → 1.4 — Role Assigned User Data
1.2 → 1.6 — User Management Event Data
Super Admin → 1.3 — Director/Admin User Data
1.3 → D1 — Provisioned User Profile
1.3 → 1.4 — Provisioned User Data
1.3 → 1.6 — User Management Event Data
1.4 → D1 — Activated User Record
1.4 → D1 — Activated Director/Admin Record
1.4 → Faculty — Account Status
1.4 → RET Chair — Account Status
1.4 → Director — Account Status
1.4 → Super Admin — Account Status
1.4 → 1.6 — User Management Event Data
D1 → 1.5 — Stored User Data
1.5 → Super Admin — User Roster Data
1.5 → RET Chair — College User Roster Data
1.6 → D6 — User Management Event Record

Sub-processes:
- 1.1 — **Determine Approval Outcome** — reviews pending self-registered accounts and records the Super Admin's approve/reject decision; issues rejection notifications directly to actors
- 1.2 — **Assign User Role** — assigns role to approved user
- 1.3 — **Provision Director/Admin Profile** — provisions Director/Admin accounts directly
- 1.4 — **Activate User Account** — finalizes activation in D1 for both role-assigned self-registered accounts and provisioned Director/Admin profiles; issues activation notifications to actors
- 1.5 — **Generate User Roster** — generates user roster and college user roster from D1
- 1.6 — **Record User Event** — consolidates and records all user management events in D6

---

**LEVEL 1 DFD — Process 2.0: Manage System Access**

Super Admin → 2.1 — Access Data
Director → 2.1 — Access Data
RET Chair → 2.1 — Access Data
Faculty → 2.1 — Access Data
D1 → 2.1 — Provisioned User Profile
2.1 → D1 — Pending User Record
2.1 → Faculty — Account Status
2.1 → RET Chair — Account Status
2.1 → 2.2 — User Access Data
2.1 → 2.4 — Password Reset Request Data
D1 → 2.2 — Stored Credentials
D1 → 2.2 — Activated User Record
2.2 → Super Admin — Access Authorization
2.2 → Director — Access Authorization
2.2 → RET Chair — Access Authorization
2.2 → Faculty — Access Authorization
2.2 → 2.3 — Authentication Event Data
2.3 → D6 — Access Event Record
D1 → 2.4 — Stored User Email
2.4 → D7 — OTP Record
2.4 → Super Admin — OTP
2.4 → Director — OTP
2.4 → RET Chair — OTP
2.4 → Faculty — OTP
D7 → 2.5 — OTP Record
Super Admin → 2.5 — OTP Submission
Director → 2.5 — OTP Submission
RET Chair → 2.5 — OTP Submission
Faculty → 2.5 — OTP Submission
2.5 → 2.6 — Validated OTP Data
Super Admin → 2.6 — New Password Data
Director → 2.6 — New Password Data
RET Chair → 2.6 — New Password Data
Faculty → 2.6 — New Password Data
2.6 → D1 — Updated Password
2.6 → D7 — Invalidated OTP Record
2.6 → 2.3 — Password Reset Event Data

Sub-processes:
- 2.1 — **Process Access Request** — handles self-registration, provisioned login routing, and password reset request routing
- 2.2 — **Validate Login Credentials** — validates credentials against D1 and grants access authorization
- 2.3 — **Record Access Event** — records authentication and password reset events in D6
- 2.4 — **Generate Reset OTP** — validates email against D1, generates OTP, stores in D7, and sends to actor
- 2.5 — **Validate OTP** — validates submitted OTP against stored OTP record in D7
- 2.6 — **Update Password** — validates password match, updates password in D1, invalidates OTP in D7

---

**LEVEL 1 DFD — Process 3.0: Monitor Dashboard**

Director → 3.1 — Dashboard Query
RET Chair → 3.1 — Dashboard Query
Faculty → 3.1 — Dashboard Query
D2 → 3.1 — Proposal Metrics
D2 → 3.1 — Evaluation Metrics
D4 → 3.1 — Aggregated Project Data
D5 → 3.1 — Project Report Metrics
3.1 → 3.2 — Retrieved Dashboard Data
3.2 → 3.3 — Compiled Dashboard Data
3.3 → Director — Project Metrics
3.3 → Faculty — Project Metrics
3.3 → RET Chair — College Project Metrics

Sub-processes:
- 3.1 — **Retrieve Dashboard Data** — receives query and retrieves proposal metrics and evaluation metrics from D2, aggregated project data from D4, and project report metrics from D5
- 3.2 — **Compile Dashboard Data** — compiles retrieved data into role-appropriate dashboard format
- 3.3 — **Present Dashboard Metrics** — displays role-specific metrics to each actor

---

**LEVEL 1 DFD — Process 4.0: Manage Project Proposals**

Faculty → 4.1 — Proposal Documents
RET Chair → 4.1 — Proposal Documents
D2 → 4.1 — Existing Proposal Data
D2 → 4.1 — Proposal Status & Feedback
D2 → 4.1 — Submission History
4.1 → 4.2 — Reviewed Proposal Data
4.1 → 4.3 — Submission History Data
4.2 → D2 — New/Revised Proposal Record
4.2 → 4.3 — Recorded Proposal Data
4.2 → 4.4 — Proposal Event Data
4.3 → D2 — Pending Proposal Record
4.3 → Faculty — Submission Acknowledgment
4.3 → RET Chair — Submission Acknowledgment
4.3 → 4.4 — Proposal Event Data
4.4 → D6 — Proposal Event Record

Sub-processes:
- 4.1 — **Review Proposal Submission** — retrieves existing proposal state, feedback, and submission history from D2; reviews proposal documents against existing state
- 4.2 — **Record Proposal Data** — records reviewed new or revised proposal data in D2
- 4.3 — **Route Proposal for Evaluation** — checks submission history to determine routing path; routes resubmissions that previously cleared RET Chair directly to Director in 6.0, otherwise routes through full evaluation sequence; sends submission acknowledgment
- 4.4 — **Record Proposal Event** — records proposal submission and resubmission events in D6

---

**LEVEL 1 DFD — Process 5.0: Manage MOA Records**

Director → 5.1 — MOA Files & Validity Dates
D3 → 5.1 — Existing MOA Records
5.1 → 5.2 — Reviewed MOA Data
5.2 → D3 — Master MOA Record
5.2 → 5.3 — Recorded MOA Data
5.3 → Director — MOA Status
5.3 → D3 — Verified MOA Record
5.3 → 5.4 — MOA Event Data
5.4 → D6 — MOA Event Record

Sub-processes:
- 5.1 — **Review MOA Submission** — retrieves existing MOA records from D3 and reviews submitted MOA files and validity dates against them
- 5.2 — **Record MOA Data** — records reviewed MOA data in D3
- 5.3 — **Verify MOA Record** — updates MOA status and routes verified MOA reference in D3
- 5.4 — **Record MOA Event** — records MOA upload and update events in D6

---

**LEVEL 1 DFD — Process 6.0: Evaluate Project Proposal**

D2 → 6.1 — Pending Proposal Record
D2 → 6.1 — Submission History
6.1 → RET Chair — Review Assignment
6.1 → 6.2 — Retrieved Proposal Data
6.1 → 6.4 — Bypassed Proposal Data
6.1 → 6.6 — Routing Event Data
RET Chair → 6.2 — Evaluation Decision & Comments
D2 → 6.2 — Prerequisite Status
6.2 → D2 — Updated Proposal Status
6.2 → D2 — Proposal Feedback Record
6.2 → RET Chair — Evaluation Status
6.2 → Faculty — Proposal Status & Feedback
6.2 → RET Chair — Proposal Status & Feedback
6.2 → 6.3 — Endorsement Result
6.2 → 6.4 — Endorsed Proposal Data
6.2 → 6.6 — Endorsement Event Data
6.3 → D2 — Endorsed Proposal Record
6.3 → 6.4 — Routed Endorsement Record
Director → 6.4 — Evaluation Decision & Comments
Director → 6.4 — Approval Review Request
D3 → 6.4 — Verified MOA Record
6.4 → Director — Available MOA List
6.4 → Director — Proposal Status & Feedback
6.4 → RET Chair — Proposal Status & Feedback
6.4 → Faculty — Proposal Status & Feedback
6.4 → Director — Evaluation Status
6.4 → D2 — Proposal Feedback Record
6.4 → 6.5 — Approval Transaction Data
6.4 → 6.6 — Director Decision Event Data
Director → 6.5 — Approval Decision
D3 → 6.5 — Selected MOA Record
6.5 → D2 — Approved Proposal Record
6.5 → 6.6 — Approval Event Data
6.6 → D6 — Evaluation Event Record

Sub-processes:
- 6.1 — **Retrieve Proposal Details** — retrieves pending proposal and submission history from D2; routes to 6.2 for full evaluation or directly to 6.4 if RET Chair stage is bypassed; sends Review Assignment to RET Chair
- 6.2 — **Determine Endorsement Outcome** — processes RET Chair endorsement, return, or rejection; writes feedback to D2 before notifying project leader
- 6.3 — **Route Endorsed Proposal** — routes endorsed proposal record to D2 and forwards to 6.4
- 6.4 — **Review Proposal for Approval** — displays endorsed proposal details and available MOA list to Director; processes Director return or rejection and writes feedback to D2 before notifying project leader
- 6.5 — **Approve Proposal** — validates selected MOA against D3 and records approved proposal in D2
- 6.6 — **Record Evaluation Event** — records all evaluation events in D6

---

**LEVEL 1 DFD — Process 7.0: Manage Projects**

D2 → 7.1 — Approved Proposal Record
Faculty → 7.1 — Special Order Documents
RET Chair → 7.1 — Special Order Documents
Director → 7.1 — Special Order Documents
7.1 → D4 — Special Order Records
7.1 → 7.2 — Validated Special Order Data
7.1 → 7.8 — Special Order Event Data
Director → 7.2 — Activate Project Request
Director → 7.2 — Reporting Frequency
Director → 7.2 — Reporting Dates
D3 → 7.2 — Verified MOA Record
7.2 → D4 — Active Project Record
7.2 → D4 — Project Reporting Schedule
7.2 → D4 — Linked MOA Reference
7.2 → 7.8 — Project Activation Event Data
D4 → 7.3 — Active Project Record
Director → 7.3 — Project Implementation Updates
RET Chair → 7.3 — Project Updates
7.3 → D4 — Updated Project Record
7.3 → Director — Active Project Status
7.3 → RET Chair — Active Project Status
7.3 → Faculty — Active Project Status
7.3 → 7.8 — Project Update Event Data
D4 → 7.4 — Project Reporting Schedule
RET Chair → 7.4 — Schedule Adjustment Request
Director → 7.4 — Reporting Frequency
Director → 7.4 — Reporting Dates
7.4 → D4 — Updated Project Reporting Schedule
7.4 → RET Chair — Active Project Status
7.4 → 7.8 — Schedule Adjustment Event Data
D4 → 7.5 — Active Project Records
D3 → 7.5 — MOA Validity Dates
7.5 → D4 — MOA Expired Flag
7.5 → Director — MOA Expiry Alert
7.5 → 7.8 — MOA Expiry Event Data
D3 → 7.6 — Updated MOA Record
7.6 → D4 — Updated MOA Reference
7.6 → D4 — Cleared MOA Expired Flag
7.6 → 7.8 — MOA Update Event Data
D4 → 7.7 — Project Reporting Schedule
D5 → 7.7 — Submitted Report Records
7.7 → D4 — Report Overdue Flag
7.7 → Faculty — Overdue Report Alert
7.7 → RET Chair — Overdue Report Alert
7.7 → 7.8 — Overdue Report Event Data
7.8 → D6 — Project Event Record
7.8 → 7.9 — Project Metrics Data
D4 → 7.9 — Active Project Records
7.9 → D4 — Aggregated Project Data

Sub-processes:
- 7.1 — **Record Special Orders** — retrieves approved proposal record from D2 and project member list; receives SO documents from Faculty, RET Chair, or Director; validates and records SO records per member in D4; forwards validated SO data to 7.2
- 7.2 — **Activate Project** — receives validated SO data from 7.1, Director's activation request, MOA selection, and reporting schedule; validates MOA against D3; creates Active Project Record, Project Reporting Schedule, and Linked MOA Reference in D4 *(decomposed in Level 2)*
- 7.3 — **Record Project Updates** — records implementation updates from Director and project updates from RET Chair; updates project status in D4; sends Active Project Status to actors
- 7.4 — **Adjust Reporting Schedule** — handles schedule adjustment requests from RET Chair; forwards to Director for approval; updates reporting schedule in D4 if approved; notifies RET Chair of outcome
- 7.5 — **Monitor MOA Validity** — periodically retrieves active project records from D4 and checks linked MOA validity dates against D3; flags expired MOAs in D4 and notifies Director
- 7.6 — **Update Linked MOA** — retrieves updated MOA record from D3 after Director updates via UC-5; re-links updated MOA reference to active project record in D4; clears MOA Expired flag
- 7.7 — **Monitor Report Deadlines** — periodically retrieves reporting schedules from D4 and checks submitted report records in D5; flags overdue reports in D4 and notifies Faculty and RET Chair
- 7.8 — **Record Project Event** — consolidates and records Special Order upload, activation, project update, schedule adjustment, MOA update, and overdue report events in D6
- 7.9 — **Update Project Metrics** — reads active project records from D4 and writes aggregated project data to D4 for dashboard

---

**LEVEL 1 DFD — Process 8.0: Manage Project Reports**

Faculty → 8.1 — Progress Report
RET Chair → 8.1 — Progress Report
Faculty → 8.1 — Terminal Report
RET Chair → 8.1 — Terminal Report
Faculty → 8.1 — Final Accomplishment Report
RET Chair → 8.1 — Final Accomplishment Report
D4 → 8.1 — Active Project Context
D4 → 8.1 — Project Reporting Schedule
D4 → 8.1 — Report Overdue Flag
8.1 → 8.2 — Validated Report Data
8.2 → D5 — Progress Report Record
8.2 → Faculty — Report Acknowledgment
8.2 → RET Chair — Report Acknowledgment
8.2 → 8.3 — Validated Closure Data
8.2 → 8.4 — Recorded Report Data
8.3 → D5 — Terminal Report Record
8.3 → D5 — Final Accomplishment Report Record
8.3 → D4 — Project Completion Status
8.3 → D4 — Closed Project Record
8.3 → D4 — Cleared Report Overdue Flag
8.3 → 8.4 — Closure Report Data
8.4 → D5 — Project Report Metrics
8.4 → 8.5 — Report Event Data
8.5 → D6 — Report Event Record

Sub-processes:
- 8.1 — **Verify Report Submission** — verifies active project context and reporting schedule from D4; reads Report Overdue Flag from D4; receives Progress Report, Terminal Report, and Final Accomplishment Report from actors
- 8.2 — **Record Progress Report** — validates and records progress or overdue report in D5; sends acknowledgment to actor; forwards closure path data to 8.3
- 8.3 — **Process Project Closure** — validates that both Terminal Report and Final Accomplishment Report are present; records both in D5; evaluates project closure based on Terminal Report; updates project completion status and closes active project record in D4; clears Report Overdue flag if applicable
- 8.4 — **Update Report Metrics** — routes project report metrics to D5 for dashboard
- 8.5 — **Record Report Event** — records progress report submission, terminal report submission, final accomplishment report submission, overdue report submission, and project closure events in D6

---

**LEVEL 1 DFD — Process 9.0: Manage Activity Logs**

D6 → 9.1 — System Event Records
9.1 → D6 — Aggregated Event Log
Super Admin → 9.2 — Audit Log Request
D6 → 9.2 — Stored Event Records
9.2 → 9.3 — Audit Log Data
Super Admin → 9.3 — Filter/Search Parameters
9.3 → Super Admin — System Audit Trail Data
9.3 → Super Admin — Filtered Log Results

Sub-processes:
- 9.1 — **Aggregate System Events** — reads all system event records from D6 and consolidates into structured aggregated event log
- 9.2 — **Retrieve Audit Log** — retrieves stored event records from D6 and prepares audit log data
- 9.3 — **Generate Audit Trail** — applies filter/search parameters and generates audit trail data for Super Admin

---

# LEVEL 2 DFD

**LEVEL 2 DFD — Process 7.2: Activate Project**

7.1 → 7.2.1 — Validated Special Order Data
Director → 7.2.1 — Activate Project Request
D2 → 7.2.1 — Approved Proposal Record
7.2.1 → 7.2.3 — Project Activation Data
Director → 7.2.2 — Reporting Frequency
Director → 7.2.2 — Reporting Dates
7.2.2 → 7.2.3 — Project Reporting Schedule Data
D3 → 7.2.3 — Verified MOA Record
7.2.3 → D4 — Active Project Record
7.2.3 → D4 — Project Reporting Schedule
7.2.3 → D4 — Linked MOA Reference

Sub-processes:
- 7.2.1 — **Process Project Activation** — receives validated Special Order data from 7.1, Director's activation request, and approved proposal record from D2; prepares project activation data
- 7.2.2 — **Configure Reporting Schedule** — records reporting frequency and reporting dates from Director and produces reporting schedule data
- 7.2.3 — **Create Active Project** — combines project activation data, reporting schedule data, and verified MOA record from D3; creates active project record, establishes project reporting schedule, and links verified MOA reference in D4

Balance check: parent 7.2 receives Validated Special Order Data from 7.1, Activate Project Request/Reporting Frequency/Reporting Dates from Director, Approved Proposal Record from D2, and Verified MOA Record from D3 — all present among children. Parent 7.2 outputs Active Project Record, Project Reporting Schedule, and Linked MOA Reference to D4 — all present via 7.2.3. Project Activation Event Data exits via 7.8 at Level 1 and is not the responsibility of this Level 2 decomposition.

---

**Data Stores:**
- D1 — Users
- D2 — Proposals
- D3 — MOA Records
- D4 — Projects
- D5 — Project Reports
- D6 — Activity Logs
- D7 — Password Reset Tokens