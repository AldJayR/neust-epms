# CONTEXT DIAGRAM

**Process 0:** NEUST Extension Services Project Management System

**Super Admin**
- Super Admin → 0 — Access Data
- Super Admin → 0 — User Role Assignments
- Super Admin → 0 — Audit Log Request
- Super Admin → 0 — Filter/Search Parameters
- 0 → Super Admin — User Roster Data
- 0 → Super Admin — Account Status
- 0 → Super Admin — System Audit Trail Data
- 0 → Super Admin — Access Authorization

**Director**
- Director → 0 — Access Data
- Director → 0 — MOA Files & Validity Dates
- Director → 0 — Project Management Data
- Director → 0 — Dashboard Query
- 0 → Director — Access Authorization
- 0 → Director — MOA Status
- 0 → Director — Project Status Data
- 0 → Director — MOA Expiry Alert
- 0 → Director — OTP

**RET Chair**
- RET Chair → 0 — Access Data
- RET Chair → 0 — Project Documents
- RET Chair → 0 — Evaluation Decision & Comments
- RET Chair → 0 — Dashboard Query
- 0 → RET Chair — Access Authorization
- 0 → RET Chair — College User Roster Data
- 0 → RET Chair — Project Status Data
- 0 → RET Chair — Account Status
- 0 → RET Chair — Overdue Report Alert
- 0 → RET Chair — OTP

**Faculty**
- Faculty → 0 — Access Data
- Faculty → 0 — Project Documents
- Faculty → 0 — Dashboard Query
- 0 → Faculty — Access Authorization
- 0 → Faculty — Project Status Data
- 0 → Faculty — Account Status
- 0 → Faculty — Overdue Report Alert
- 0 → Faculty — OTP

**Combined flow definitions:**
- Access Data = Access Credentials + Self-Registration Details + Password Reset Request + OTP Submission + New Password Data
- Project Management Data = Project Implementation Updates + Reporting Frequency + Reporting Dates + Evaluation Decision & Comments + Project Updates + Approval Review Request + Schedule Adjustment Request
- Project Documents = Proposal Documents + Project Report Documents
- Project Status Data = Proposal Status & Feedback + Evaluation Status + Active Project Status + Submission Acknowledgment + Report Acknowledgment + Project Metrics + College Project Metrics + Available MOA List

---

# LEVEL 0 DFD

**Process 1.0 — Manage User Accounts**
Super Admin → 1.0 — User Role Assignments
2.0 → 1.0 — Pending User Record
1.0 → Super Admin — User Roster Data
1.0 → RET Chair — College User Roster Data
1.0 → Faculty — Account Status
1.0 → RET Chair — Account Status
1.0 → Super Admin — Account Status
1.0 → 2.0 — Provisioned User Profile
1.0 → 9.0 — System Event Data

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
2.0 → Super Admin — Account Status
2.0 → Faculty — Account Status
2.0 → RET Chair — Account Status
2.0 → 1.0 — Pending User Record
2.0 → 9.0 — System Event Data

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
6.0 → 4.0 — Proposal Status & Feedback
4.0 → Faculty — Submission Acknowledgment
4.0 → RET Chair — Submission Acknowledgment
4.0 → 6.0 — Pending Proposal Record
4.0 → 9.0 — System Event Data

**Process 5.0 — Manage MOA Records**
Director → 5.0 — MOA Files & Validity Dates
5.0 → Director — MOA Status
5.0 → 9.0 — System Event Data

**Process 6.0 — Evaluate Project Proposal**
RET Chair → 6.0 — Evaluation Decision & Comments
Director → 6.0 — Evaluation Decision & Comments
Director → 6.0 — Approval Review Request
Director → 6.0 — Reporting Frequency
Director → 6.0 — Reporting Dates
Director → 6.0 — Approval Decision
4.0 → 6.0 — Pending Proposal Record
6.0 → Faculty — Proposal Status & Feedback
6.0 → RET Chair — Proposal Status & Feedback
6.0 → Director — Proposal Status & Feedback
6.0 → Director — Available MOA List
6.0 → RET Chair — Evaluation Status
6.0 → Director — Evaluation Status
6.0 → 4.0 — Proposal Status & Feedback
6.0 → 9.0 — System Event Data

**Process 7.0 — Manage Projects**
Director → 7.0 — Project Implementation Updates
Director → 7.0 — Reporting Frequency
Director → 7.0 — Reporting Dates
RET Chair → 7.0 — Project Updates
RET Chair → 7.0 — Schedule Adjustment Request
7.0 → Director — Active Project Status
7.0 → Director — MOA Expiry Alert
7.0 → RET Chair — Active Project Status
7.0 → Faculty — Overdue Report Alert
7.0 → RET Chair — Overdue Report Alert
7.0 → 3.0 — Aggregated Project Data
7.0 → 9.0 — System Event Data

**Process 8.0 — Manage Project Reports**
Faculty → 8.0 — Project Report Documents
RET Chair → 8.0 — Project Report Documents
7.0 → 8.0 — Overdue Report Alert
8.0 → Faculty — Report Acknowledgment
8.0 → RET Chair — Report Acknowledgment
8.0 → 3.0 — Project Report Metrics
8.0 → 9.0 — System Event Data

**Process 9.0 — Manage Activity Logs**
Super Admin → 9.0 — Audit Log Request
Super Admin → 9.0 — Filter/Search Parameters
1.0 → 9.0 — System Event Data
2.0 → 9.0 — System Event Data
4.0 → 9.0 — System Event Data
5.0 → 9.0 — System Event Data
6.0 → 9.0 — System Event Data
7.0 → 9.0 — System Event Data
8.0 → 9.0 — System Event Data
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
1.4 → Super Admin — Account Status
1.4 → 1.6 — User Management Event Data
D1 → 1.5 — Stored User Data
1.5 → Super Admin — User Roster Data
1.5 → RET Chair — College User Roster Data
1.6 → D6 — System Event Record

Sub-processes:
- 1.1 — **Determine Approval Outcome** — reviews pending self-registered accounts and records the Super Admin's approve/reject decision; issues rejection notifications directly
- 1.2 — **Assign User Role** — assigns role to approved user
- 1.3 — **Provision Director/Admin Profile** — provisions Director/Admin accounts directly
- 1.4 — **Activate Approved User Profile** — finalizes activation in D1 for both role-assigned self-registered accounts and provisioned Director/Admin profiles, and issues activation notifications
- 1.5 — **Generate User Roster** — generates user roster and college user roster
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
2.1 → Super Admin — Account Status
2.1 → 2.2 — User Access Data
2.1 → 2.4 — Password Reset Request Data
D1 → 2.2 — Stored Credentials
D1 → 2.2 — Activated User Record
2.2 → Super Admin — Access Authorization
2.2 → Director — Access Authorization
2.2 → RET Chair — Access Authorization
2.2 → Faculty — Access Authorization
2.2 → 2.3 — Authentication Event Data
2.3 → D6 — Authentication Event Log
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
- 2.1 — **Route Access Request** — handles self-registration, provisioned login, and password reset requests
- 2.2 — **Validate Login Credentials** — validates credentials and grants access authorization
- 2.3 — **Record Access Event** — records authentication and password reset events in D6
- 2.4 — **Generate Reset OTP** — validates email, generates and sends OTP to D7 and actor
- 2.5 — **Validate OTP** — validates submitted OTP against stored OTP record in D7
- 2.6 — **Update Password** — validates password match, updates password in D1, invalidates OTP in D7

---

**LEVEL 1 DFD — Process 3.0: Monitor Dashboard**

Director → 3.1 — Dashboard Query
RET Chair → 3.1 — Dashboard Query
Faculty → 3.1 — Dashboard Query
D4 → 3.1 — Aggregated Project Data
D5 → 3.1 — Project Report Metrics
3.1 → 3.2 — Dashboard Query Data
3.2 → 3.3 — Compiled Dashboard Data
3.3 → Director — Project Metrics
3.3 → Faculty — Project Metrics
3.3 → RET Chair — College Project Metrics

Sub-processes:
- 3.1 — **Retrieve Dashboard Data** — receives query and retrieves aggregated project data from D4 and project report metrics from D5
- 3.2 — **Compile Dashboard Data** — compiles retrieved data into role-appropriate dashboard format
- 3.3 — **Present Dashboard Metrics** — displays role-specific metrics to each actor

---

**LEVEL 1 DFD — Process 4.0: Manage Project Proposals**

Faculty → 4.1 — Proposal Documents
RET Chair → 4.1 — Proposal Documents
D2 → 4.1 — Existing Proposal State
D2 → 4.1 — Proposal Status & Feedback
D2 → 4.1 — Submission History
4.1 → 4.2 — Validated Proposal Data
4.1 → 4.3 — Submission History Data
4.2 → D2 — New/Revised Proposal Record
4.2 → 4.3 — Validated Proposal Record
4.3 → D2 — Pending Proposal Record
4.3 → Faculty — Submission Acknowledgment
4.3 → RET Chair — Submission Acknowledgment
4.3 → 4.4 — Proposal Event Data
4.4 → D6 — System Event Record

Sub-processes:
- 4.1 — **Validate Proposal Payload** — validates proposal documents against existing proposal state; retrieves proposal status, feedback, and submission history from D2 for resubmissions
- 4.2 — **Record Proposal Data** — records validated new or revised proposal data in D2
- 4.3 — **Route Pending Proposal** — checks submission history to determine routing path; routes resubmissions that previously cleared RET Chair directly to Director in 6.0, otherwise routes through full evaluation sequence; sends submission acknowledgment
- 4.4 — **Record Proposal Event** — records proposal submission, resubmission, and special order events in D6

---

**LEVEL 1 DFD — Process 5.0: Manage MOA Records**

Director → 5.1 — MOA Files & Validity Dates
D3 → 5.1 — Existing MOA Records
5.1 → 5.2 — Validated MOA Data
5.2 → D3 — Master MOA Record
5.2 → 5.3 — Validated MOA Record
5.3 → Director — MOA Status
5.3 → D3 — Verified MOA
5.3 → 5.4 — MOA Event Data
5.4 → D6 — System Event Record

Sub-processes:
- 5.1 — **Validate MOA Details** — validates MOA files and validity dates against existing records in D3
- 5.2 — **Record MOA Data** — records validated MOA data in D3
- 5.3 — **Route Verified MOA** — updates MOA status and routes verified MOA reference in D3
- 5.4 — **Record MOA Event** — records MOA upload and update events in D6

---

**LEVEL 1 DFD — Process 6.0: Evaluate Project Proposal**

D2 → 6.1 — Pending Proposal Record
D2 → 6.1 — Submission History
6.1 → RET Chair — Proposal Status & Feedback
6.1 → 6.2 — Retrieved Proposal Data
6.1 → 6.4 — Bypassed Proposal Data
RET Chair → 6.2 — Evaluation Decision & Comments
D2 → 6.2 — Prerequisite Status Check
6.2 → D2 — Updated Proposal Status
6.2 → D2 — Proposal Feedback Record
6.2 → RET Chair — Evaluation Status
6.2 → Faculty — Proposal Status & Feedback
6.2 → RET Chair — Proposal Status & Feedback
6.2 → 4.0 — Proposal Status & Feedback
6.2 → 6.3 — Endorsement Decision
6.3 → D2 — Endorsed Proposal Record
6.3 → 6.4 — Routed Endorsement Record
Director → 6.4 — Evaluation Decision & Comments
Director → 6.4 — Approval Review Request
D2 → 6.4 — Endorsed Proposal Record
D3 → 6.4 — Available MOA List
6.4 → Director — Available MOA List
6.4 → Director — Proposal Status & Feedback
6.4 → RET Chair — Proposal Status & Feedback
6.4 → Faculty — Proposal Status & Feedback
6.4 → Director — Evaluation Status
6.4 → D2 — Proposal Feedback Record
6.4 → 4.0 — Proposal Status & Feedback
6.4 → 6.5 — Approval Transaction Data
Director → 6.5 — Reporting Frequency
Director → 6.5 — Reporting Dates
Director → 6.5 — Approval Decision
D3 → 6.5 — Selected MOA Record
6.5 → D2 — Approved Proposal Record
6.5 → D4 — Active Project Record
6.5 → D4 — Project Reporting Schedule
6.5 → 6.6 — Evaluation Event Data
6.6 → D6 — System Event Record

Sub-processes:
- 6.1 — **Retrieve Proposal Details** — retrieves pending proposal from D2; checks submission history to determine if RET Chair stage should be bypassed; routes accordingly to 6.2 or directly to 6.4
- 6.2 — **Determine Endorsement Outcome** — processes RET Chair endorsement, return, or rejection; writes feedback to D2 before notifying project leader
- 6.3 — **Route Endorsed Proposal** — routes endorsed proposal record to D2 and forwards to 6.4
- 6.4 — **Present Approval Details** — displays endorsed proposal details and available MOA list to Director; processes Director return or rejection and writes feedback to D2 before notifying project leader
- 6.5 — **Finalize Project Approval** — atomically approves proposal, links MOA, sets reporting schedule, creates active project *(decomposed in Level 2)*
- 6.6 — **Record Evaluation Event** — records all evaluation and project creation events in D6

---

**LEVEL 1 DFD — Process 7.0: Manage Projects**

D4 → 7.1 — Active Project Records
7.1 → 7.2 — Retrieved Project Data
Director → 7.2 — Project Implementation Updates
RET Chair → 7.2 — Project Updates
7.2 → D4 — Updated Project Record
7.2 → Director — Active Project Status
7.2 → RET Chair — Active Project Status
7.2 → 7.4 — Project Update Event Data
D4 → 7.3 — Project Reporting Schedule
RET Chair → 7.3 — Schedule Adjustment Request
Director → 7.3 — Reporting Frequency
Director → 7.3 — Reporting Dates
7.3 → D4 — Updated Project Reporting Schedule
7.3 → 7.4 — Schedule Event Data
D4 → 7.6 — Active Project Records
D3 → 7.6 — MOA Validity Dates
7.6 → D4 — MOA Expired Flag
7.6 → Director — MOA Expiry Alert
7.6 → 7.4 — MOA Expiry Event Data
D4 → 7.7 — Project Reporting Schedule
D5 → 7.7 — Submitted Report Records
7.7 → D4 — Report Overdue Flag
7.7 → Faculty — Overdue Report Alert
7.7 → RET Chair — Overdue Report Alert
7.7 → 8.0 — Overdue Report Alert
7.7 → 7.4 — Overdue Report Event Data
7.4 → D6 — System Event Record
7.4 → 7.5 — Logged Event Data
D4 → 7.5 — Active Project Records
7.5 → D4 — Aggregated Project Data

Sub-processes:
- 7.1 — **Retrieve Active Project** — retrieves active project records from D4
- 7.2 — **Record Project Update** — records implementation updates and updates project status in D4
- 7.3 — **Adjust Reporting Schedule** — handles reporting schedule adjustment requests from RET Chair; forwards to Director for approval; updates D4 if approved
- 7.4 — **Record Project Event** — records project update, schedule adjustment, MOA expiry, and overdue report events in D6
- 7.5 — **Update Project Metrics** — reads active project records from D4 and writes aggregated project data to D4 for dashboard
- 7.6 — **Check MOA Validity** — periodically retrieves active project records from D4 and checks linked MOA validity dates against D3; flags expired MOAs in D4 and notifies Director
- 7.7 — **Monitor Report Deadlines** — periodically retrieves reporting schedules from D4 and checks submitted report records in D5; flags overdue reports in D4 and notifies Faculty and RET Chair

---

**LEVEL 1 DFD — Process 8.0: Manage Project Reports**

Faculty → 8.1 — Project Report Documents
RET Chair → 8.1 — Project Report Documents
7.0 → 8.1 — Overdue Report Alert
D4 → 8.1 — Active Project Context
D4 → 8.1 — Project Reporting Schedule
8.1 → 8.2 — Validated Report Data
8.1 → 8.2 — Overdue Report Flag
8.2 → D5 — Progress/Terminal Report Record
8.2 → Faculty — Report Acknowledgment
8.2 → RET Chair — Report Acknowledgment
8.2 → 8.3 — Report Type Data
8.3 → D4 — Project Completion Status
8.3 → D4 — Closed Project Record
8.3 → D4 — Cleared Report Overdue Flag
8.3 → 8.4 — Report Closure Data
8.4 → D5 — Project Report Metrics
8.4 → 8.5 — Report Event Data
8.5 → D6 — System Event Record

Sub-processes:
- 8.1 — **Verify Active Project** — verifies active project context and reporting schedule from D4; receives overdue report alert from 7.0 and carries overdue flag into validation
- 8.2 — **Record Project Report** — validates and records progress, terminal, or overdue report in D5; sends acknowledgment to actor
- 8.3 — **Evaluate Project Closure** — evaluates report type; closes active project record in D4 if terminal report; clears Report Overdue flag in D4 if overdue report submitted
- 8.4 — **Route Report Metrics** — routes project report metrics to D5 for dashboard
- 8.5 — **Record Report Event** — records report submission, overdue report submission, and project closure events in D6

---

**LEVEL 1 DFD — Process 9.0: Manage Activity Logs**

D6 → 9.1 — System Event Records
9.1 → D6 — Aggregated Event Log
Super Admin → 9.2 — Audit Log Request
D6 → 9.2 — Audit Log Query
9.2 → 9.3 — Filtered Audit Log Query
Super Admin → 9.3 — Filter/Search Parameters
9.3 → Super Admin — System Audit Trail Data
9.3 → Super Admin — Filtered Log Results

Sub-processes:
- 9.1 — **Aggregate System Events** — reads all system event records from D6 and consolidates into structured aggregated event log
- 9.2 — **Retrieve Audit Log** — retrieves audit log query from D6 and prepares filtered audit log query
- 9.3 — **Generate Audit Trail** — applies filter/search parameters and generates audit trail data for Super Admin

---

# LEVEL 2 DFD

**LEVEL 2 DFD — Process 6.5: Finalize Project Approval**

6.4 → 6.5.1 — Approval Transaction Data
Director → 6.5.1 — Approval Decision
6.5.1 → D2 — Approved Proposal Record
6.5.1 → 6.5.4 — Approved Proposal Data
D3 → 6.5.2 — Selected MOA Record
6.5.2 → 6.5.4 — Linked MOA Reference
Director → 6.5.3 — Reporting Frequency
Director → 6.5.3 — Reporting Dates
6.5.3 → 6.5.4 — Reporting Schedule Data
6.5.4 → D4 — Active Project Record
6.5.4 → D4 — Project Reporting Schedule

Sub-processes:
- 6.5.1 — **Approve Proposal** — records the Director's approval decision and writes the approved proposal record to D2
- 6.5.2 — **Link MOA** — retrieves and attaches the selected MOA reference from D3
- 6.5.3 — **Set Reporting Schedule** — captures reporting frequency and dates from Director and produces reporting schedule data
- 6.5.4 — **Create Active Project** — combines approved proposal data, linked MOA reference, and reporting schedule data to create the active project record and project reporting schedule in D4

Balance check: parent 6.5 receives Approval Transaction Data from 6.4, Approval Decision/Reporting Frequency/Reporting Dates from Director, and Selected MOA Record from D3 — all present among children. Parent 6.5 outputs Approved Proposal Record to D2 and Active Project Record/Project Reporting Schedule to D4 — all present among children. Evaluation Event Data exits via 6.6 at Level 1 and is not the responsibility of this Level 2 decomposition.

---

**Data Stores:**
- D1 — Users
- D2 — Proposals
- D3 — MOA Records
- D4 — Projects
- D5 — Project Reports
- D6 — Activity Logs
- D7 — Password Reset Tokens