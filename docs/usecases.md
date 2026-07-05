### **UC-1: Manage User Accounts**

| **Use Case Name:** Manage User Accounts | **ID:** UC-1 | **Priority:** High |
|:---|:---|:---|
| **Actor:** Super Admin, RET Chair |
| **Description:** Describes how the Super Admin reviews pending self-registered accounts, assigns roles before approving, and directly provisions Director/Admin accounts. Also describes how the RET Chair retrieves a roster of faculty accounts within their scope, including pending accounts. |
| **Trigger:** Super Admin decides to process user accounts; OR RET Chair requests to view the faculty roster. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. Actor is authenticated.
2. Users Datastore is available and on-line.
3. Activity Logs Datastore is available and on-line.

**Normal Course:** (Super Admin approves pending user)

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. Super Admin requests list of pending user accounts | Account Management Request |
| 2. System displays list of pending user accounts | Pending User Records |
| 3. Super Admin selects a specific pending user to review | Selected User ID |
| 4. System displays details of the selected pending user | User Details |
| 5. Super Admin specifies the role to be assigned | Role Assignment |
| 6. Super Admin confirms account approval | Approval Decision |
| 7. System updates the user record to active with the assigned role | Activated User Record |
| 8. System records the approval event | User Management Event Data |
| 9. System notifies the user of account activation | Account Status Notice |

**Alternative Courses:**
*1.1 Super Admin rejects pending user account (branch at step 6)*
1. Super Admin specifies rejection and provides a reason. (Info: Rejection Decision, Reason)
2. System updates the user record to rejected status. (Info: Rejected User Record)
3. System records the rejection event. (Info: User Management Event Data)
4. System notifies the user of account rejection. (Info: Account Status Notice)
5. Use case ends.

*1.2 Super Admin directly provisions account (branch at step 1)*
1. Super Admin submits new user data and role assignment. (Info: New User Data, Role Assignment)
2. System validates and records the new user profile. (Info: Provisioned User Record)
3. System records the provisioning event. (Info: User Management Event Data)
4. System notifies the new user of account activation. (Info: Account Status Notice)
5. Use case ends.

*1.3 Super Admin updates existing user role (branch at step 1)*
1. Super Admin retrieves existing user record. (Info: User Query, Existing User Record)
2. Super Admin modifies role assignment. (Info: Updated Role Assignment)
3. System updates the existing user record. (Info: Updated User Record)
4. System records the role update event. (Info: User Management Event Data)
5. System notifies user of role update. (Info: Account Status Notice)
6. Use case ends.

*1.4 RET Chair views faculty roster (branch at step 1)*
1. RET Chair specifies request for faculty roster. (Info: Roster Request)
2. System determines RET Chair's scope from their user record. (Info: Scope Parameters)
3. System retrieves faculty records matching the scope, including pending accounts. (Info: Scoped User Records)
4. System displays the Faculty Roster. (Info: Faculty Roster)
5. Use case ends.

*1.5 Duplicate user detected (branch at step 7)*
1. System detects existing active account matching the pending user details. (Info: Duplicate Alert)
2. System prompts Super Admin to merge with existing record or cancel. 
3. Super Admin chooses to merge role into the existing record. (Info: Merge Decision)
4. System updates existing user record with the new role. (Info: Updated User Record)
5. Return to Normal Course step 8.

**Postconditions:**
1. Processed user records are stored or updated in the Users Datastore.
2. Administrative actions are logged.

**Exceptions:**
*E1: Super Admin cancels review (occurs at step 5 or 6)*
1. Super Admin specifies intention to cancel the review.
2. System leaves pending user record unchanged.
3. Use case ends.

*E2: No user records found in scope (occurs at Alternative Course 1.4, step 3)*
1. System notifies RET Chair that no faculty accounts exist within their scope.
2. Use case ends.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Account Management Request | Super Admin | Pending User Records | Super Admin |
| Selected User ID | Super Admin | User Details | Super Admin |
| Role Assignment | Super Admin | Activated / Rejected User Record | Users Datastore |
| Approval / Rejection Decision | Super Admin | Provisioned / Updated User Record | Users Datastore |
| New User Data | Super Admin | Account Status Notice | User |
| Merge Decision | Super Admin | User Management Event Data | Activity Logs Datastore |
| User Query | Super Admin | Duplicate Alert | Super Admin |
| Roster Request | RET Chair | Faculty Roster | RET Chair |
| Scope Parameters | Users Datastore | Scoped User Records | Users Datastore |
| Existing User Record | Users Datastore | | |
| Pending User Records | Users Datastore | | |

***

### **UC-2: Manage System Access**

| **Use Case Name:** Manage System Access | **ID:** UC-2 | **Priority:** High |
|:---|:---|:---|
| **Actor:** Super Admin, Director, RET Chair, Faculty |
| **Description:** Describes how users log in, how non-provisioned users self-register, and how users reset their passwords via OTP. |
| **Trigger:** User navigates to the portal to log in, register, or reset password. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. Users Datastore is available and on-line.
2. Activity Logs Datastore is available and on-line.
3. Password Reset Tokens Datastore is available and on-line.

**Normal Course:** (User Logs In)

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. User submits access credentials | Access Credentials |
| 2. System retrieves existing user profile | Existing User Profile |
| 3. System validates login credentials against stored credentials | Stored Credentials |
| 4. System grants access authorization based on assigned role | Access Authorization |
| 5. System records login event | Access Event Data |

**Alternative Courses:**
*2.1 User self-registers (branch at step 1)*
1. User submits self-registration details. (Info: Registration Details)
2. System creates pending user record. (Info: Pending User Record)
3. System notifies user that account is pending Super Admin approval. (Info: Account Status Notice)
4. System records self-registration event. (Info: Access Event Data)
5. Use case ends.

*2.2 User requests password reset (branch at step 1)*
1. User submits registered email address. (Info: Password Reset Request)
2. System validates email, generates OTP, and sends it to user. (Info: OTP Record, OTP Notice)
3. User submits OTP for verification. (Info: OTP Submission)
4. System validates OTP against stored OTP record. 
5. User submits new password data. (Info: New Password Data)
6. System updates password and invalidates used OTP. (Info: Updated Password Record, Invalidated OTP Record)
7. System records password reset event. (Info: Access Event Data)
8. Return to Normal Course step 1.

**Postconditions:**
1. User is granted access authorization.
2. Event is recorded in Activity Logs Datastore.

**Exceptions:**
*E1: Invalid credentials (occurs at step 3)*
1. System notifies user of invalid credentials.
2. System records failed login attempt.
3. System terminates use case.

*E2: Account not yet activated (occurs at step 2)*
1. System notifies user that account is still pending approval.
2. System terminates use case.

*E3: Invalid or expired OTP (occurs at Alternative Course 2.2, step 4)*
1. System notifies user that OTP is invalid or expired.
2. System terminates use case.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Access Credentials | User | Existing User Profile | Users Datastore |
| Registration Details | User | Access Authorization | User |
| Password Reset Request | User | Pending User Record | Users Datastore |
| OTP Submission | User | Account Status Notice | User |
| New Password Data | User | OTP Record | Password Reset Tokens Datastore |
| Stored Credentials | Users Datastore | OTP Notice | User |
| | | Updated Password Record | Users Datastore |
| | | Invalidated OTP Record | Password Reset Tokens Datastore |
| | | Access Event Data | Activity Logs Datastore |

***

### **UC-3: Monitor Dashboard**

| **Use Case Name:** Monitor Dashboard | **ID:** UC-3 | **Priority:** Medium |
|:---|:---|:---|
| **Actor:** Director, RET Chair, Faculty |
| **Description:** Describes how the system aggregates and displays role-specific metrics. Also describes how the Director views a faculty-wide overview of extension project activity. |
| **Trigger:** User navigates to their dashboard; OR Director requests the faculty activity overview. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. User is authenticated.
2. Projects Datastore is available and on-line.
3. Project Reports Datastore is available and on-line.
4. Proposals Datastore is available and on-line.
5. Users Datastore is available and on-line.

**Normal Course:** (Standard Dashboard Load)

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. User specifies request to view dashboard | Dashboard Query |
| 2. System retrieves aggregated project data | Aggregated Project Data |
| 3. System retrieves project report metrics | Project Report Metrics |
| 4. System compiles role-specific dashboard data | Compiled Dashboard Data |
| 5. System displays standard project metrics | Project Metrics |

**Alternative Courses:**
*3.1 User is an RET Chair (branch at step 4)*
1. System identifies user role as RET Chair.
2. System compiles college-specific project metrics. (Info: Compiled College Data)
3. System displays College Project Metrics to RET Chair. (Info: College Project Metrics)
4. Use case ends.

*3.2 Director requests faculty activity overview (branch at step 1)*
1. Director specifies request for faculty activity overview. (Info: Overview Request)
2. System retrieves the active faculty list. (Info: Faculty List)
3. System retrieves proposal and project records grouped by project leader. (Info: Proposal Records, Project Records)
4. System counts extension projects per faculty member. (Info: Project Counts)
5. System compiles the Faculty Activity Overview, ranked by project count. (Info: Compiled Overview Data)
6. System displays the Faculty Activity Overview to the Director. (Info: Faculty Activity Overview)
7. Use case ends.

**Postconditions:**
1. Role-specific metrics are displayed to the user.
2. Ranked Faculty Activity Overview is displayed to the Director.

**Exceptions:**
*E1: No project data available (occurs at step 2)*
1. System notifies user that no project data is currently available.
2. System displays empty dashboard metrics.
3. Use case ends.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Dashboard Query | User | Project Metrics | User |
| Overview Request | Director | College Project Metrics | RET Chair |
| Aggregated Project Data | Projects Datastore | Faculty Activity Overview | Director |
| Project Report Metrics | Project Reports Datastore | | |
| Faculty List | Users Datastore | | |
| Proposal Records | Proposals Datastore | | |
| Project Records | Projects Datastore | | |

***

### **UC-4: Manage Project Proposals**

| **Use Case Name:** Manage Project Proposals | **ID:** UC-4 | **Priority:** High |
|:---|:---|:---|
| **Actor:** Faculty, RET Chair |
| **Description:** Describes how project leaders submit new proposals or resubmit revisions for returned proposals. |
| **Trigger:** Faculty or RET Chair submits a proposal package. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. User is authenticated.
2. Proposals Datastore is available and on-line.
3. Activity Logs Datastore is available and on-line.

**Normal Course:**

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. User submits proposal documents | Proposal Documents |
| 2. System reviews proposal payload against existing proposal state | Existing Proposal State |
| 3. System records validated proposal data | Validated Proposal Data |
| 4. System automatically routes pending proposal for review | Pending Proposal Record |
| 5. System sends submission acknowledgment to user | Submission Acknowledgment |
| 6. System records proposal submission event | Proposal Event Data |

**Alternative Courses:**
*4.1 User is resubmitting a returned proposal (branch at step 1)*
1. User retrieves proposal status and feedback. (Info: Proposal Status And Feedback)
2. System checks submission history to determine prior evaluation stage reached. (Info: Submission History)
3. User submits revised proposal documents. (Info: Revised Proposal Documents)
4. System reviews revised proposal payload against existing proposal state. 
5. System records revised proposal data. (Info: Revised Proposal Record)
6. System records proposal resubmission event. (Info: Proposal Event Data)
7. If submission history shows proposal previously cleared RET Chair endorsement, system routes resubmission directly to Director, bypassing RET Chair stage.
8. Otherwise, system routes resubmission through full evaluation sequence.
9. Return to Normal Course step 5.

**Postconditions:**
1. Proposal is recorded or updated in Proposals Datastore.
2. Submission event is recorded in Activity Logs Datastore.

**Exceptions:**
*E1: Invalid proposal payload (occurs at step 2)*
1. System notifies user of invalid submission.
2. System terminates use case.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Proposal Documents | Faculty, RET Chair | Submission Acknowledgment | Faculty, RET Chair |
| Revised Proposal Documents | Faculty, RET Chair | Pending Proposal Record | Proposals Datastore |
| Proposal Withdrawal Request| Faculty, RET Chair | Validated Proposal Data | Proposals Datastore |
| Existing Proposal State | Proposals Datastore | Revised Proposal Record | Proposals Datastore |
| Proposal Status And Feedback| Proposals Datastore | Withdrawn Proposal Record | Proposals Datastore |
| Submission History | Proposals Datastore | Proposal Event Data | Activity Logs Datastore |

***

### **UC-5: Manage MOA Records**

| **Use Case Name:** Manage MOA Records | **ID:** UC-5 | **Priority:** High |
|:---|:---|:---|
| **Actor:** Director |
| **Description:** Describes how the Director uploads master legal agreements, updates validity dates, and reviews projects linked to a specific MOA. |
| **Trigger:** Director receives a signed MOA, updates an existing MOA, or reviews MOA linkages. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. Director is authenticated.
2. MOA Records Datastore is available and on-line.
3. Projects Datastore is available and on-line.
4. Activity Logs Datastore is available and on-line.

**Normal Course:**

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. Director submits MOA files and validity dates | MOA Files And Validity Dates |
| 2. System reviews MOA details against existing MOA records | Existing MOA Records |
| 3. System records reviewed MOA data | Reviewed MOA Data |
| 4. System updates MOA status | MOA Status |
| 5. System routes verified MOA reference for project activation | Verified MOA Reference |
| 6. System records MOA upload event | MOA Event Data |

**Alternative Courses:**
*5.1 MOA already exists (branch at step 2)*
1. System retrieves existing MOA record. 
2. Director submits updated MOA validity dates. (Info: Updated Validity Dates)
3. System updates existing MOA record. (Info: Updated MOA Record)
4. System records MOA update event. (Info: MOA Event Data)
5. Return to Normal Course step 4.

*5.2 Director views projects linked to an MOA (branch at step 1)*
1. Director specifies an existing MOA record to review. (Info: Selected MOA)
2. System retrieves projects associated with the selected MOA. (Info: Linked Project Data)
3. System displays the projects linked to the selected MOA. (Info: Linked Project List)
4. Use case ends.

**Postconditions:**
1. MOA record is stored or updated in MOA Records Datastore.
2. MOA upload or update event is recorded in Activity Logs Datastore.

**Exceptions:**
*E1: MOA validity date has expired (occurs at step 2)*
1. System notifies Director that MOA validity date has expired.
2. System terminates use case.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| MOA Files And Validity Dates| Director | MOA Status | Director |
| Updated Validity Dates | Director | Verified MOA Reference | MOA Records Datastore |
| Selected MOA | Director | Reviewed MOA Data | MOA Records Datastore |
| Existing MOA Records | MOA Records Datastore | Updated MOA Record | MOA Records Datastore |
| Linked Project Data | Projects Datastore | Linked Project List | Director |
| | | MOA Event Data | Activity Logs Datastore |

***

### **UC-6: Evaluate Project Proposal**

| **Use Case Name:** Evaluate Project Proposal | **ID:** UC-6 | **Priority:** High |
|:---|:---|:---|
| **Actor:** Director, RET Chair |
| **Description:** Describes the sequential evaluation where RET Chairs endorse and Directors approve pending proposals. Return and rejection decisions are logged. |
| **Trigger:** A proposal is submitted and automatically routed for review. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. Users are authenticated.
2. Proposals Datastore is available and on-line.
3. Activity Logs Datastore is available and on-line.
4. Pending proposal record exists.

**Normal Course:**

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. System notifies RET Chair of pending proposal | Pending Proposal Record |
| 2. RET Chair retrieves and reviews proposal details | Proposal Details |
| 3. RET Chair submits endorsement decision and comments | Evaluation Decision And Comments |
| 4. System records endorsement, updates proposal status, and logs event | Updated Proposal Status, Evaluation Event Data |
| 5. System routes endorsed proposal to Director | Endorsed Proposal Record |
| 6. Director retrieves and reviews endorsed proposal details | Proposal Details |
| 7. Director submits approval decision | Approval Decision |
| 8. System records approved proposal and logs approval event | Approved Proposal Record, Evaluation Event Data |

**Alternative Courses:**
*6.1 RET Chair returns or rejects proposal (branch at step 3)*
1. RET Chair submits return or rejection decision and comments. (Info: Return Or Rejection Decision)
2. System stores feedback record. (Info: Proposal Feedback Record)
3. System records RET Chair return/rejection event. (Info: Evaluation Event Data)
4. System notifies project leader of decision. (Info: Proposal Status And Feedback)
5. Use case ends.

*6.2 Bypass RET Chair stage (branch at step 1)*
1. System checks submission history and detects submitter is RET Chair OR proposal previously cleared RET Chair stage. (Info: Submission History)
2. System bypasses RET Chair endorsement stage. 
3. System records bypass event. (Info: Evaluation Event Data)
4. System routes proposal directly to Director.
5. Return to Normal Course step 6.

*6.3 Director returns or rejects proposal (branch at step 7)*
1. Director submits return or rejection decision and comments. (Info: Return Or Rejection Decision)
2. System stores feedback record. (Info: Proposal Feedback Record)
3. System records Director return/rejection event. (Info: Evaluation Event Data)
4. System notifies project leader of decision. (Info: Proposal Status And Feedback)
5. Use case ends.

**Postconditions:**
1. Evaluation status is updated in Proposals Datastore.
2. All evaluation events are recorded in Activity Logs Datastore.

**Exceptions:**
*E1: Prerequisite status check fails (occurs at step 4)*
1. System notifies evaluator that prerequisites are not met.
2. System terminates use case.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Evaluation Decision And Comments | RET Chair | Proposal Details | RET Chair, Director |
| Approval Decision | Director | Proposal Status And Feedback | Faculty |
| Return Or Rejection Decision | RET Chair, Director | Updated Proposal Status | Proposals Datastore |
| Pending Proposal Record | Proposals Datastore | Endorsed Proposal Record | Proposals Datastore |
| Submission History | Proposals Datastore | Approved Proposal Record | Proposals Datastore |
| | | Proposal Feedback Record | Proposals Datastore |
| | | Evaluation Event Data | Activity Logs Datastore |

***

### **UC-7: Manage Projects**

| **Use Case Name:** Manage Projects | **ID:** UC-7 | **Priority:** High |
|:---|:---|:---|
| **Actor:** Director, RET Chair, Faculty |
| **Description:** Describes how approved proposals are activated via Special Orders and MOA assignment. Also handles implementation updates and temporal monitoring for expired MOAs or overdue reports. |
| **Trigger:** User requests to update a project, upload orders, or activate; OR system detects expired MOA/overdue report. | **Type:** ☑ External ☑ Temporal |

**Preconditions:**
1. User is authenticated.
2. Datastores (Proposals, Projects, MOA Records, Project Reports, Activity Logs) are on-line.

**Normal Course:** (User Submits Implementation Update)

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. User retrieves active project record | Active Project Record |
| 2. User submits project implementation update | Project Implementation Updates |
| 3. System records implementation update | Project Update Record |
| 4. System updates active project status | Active Project Status |
| 5. System records project update event | Project Event Data |

**Alternative Courses:**
*7.1 Upload Special Orders (branch at step 1)*
1. System retrieves project member list from approved proposal. (Info: Approved Proposal Record)
2. User submits Special Order documents per member. (Info: Special Order Documents)
3. System validates documents and records them. (Info: Special Order Records)
4. System flags project as ready for activation.
5. Use case ends.

*7.2 Director activates the project (branch at step 1)*
1. Director specifies request to activate project. (Info: Activation Request)
2. System prompts Director for MOA and reporting schedule.
3. Director submits MOA selection and reporting schedule. (Info: Selected MOA, Reporting Schedule)
4. System validates MOA validity dates. (Info: MOA Validity Dates)
5. System creates active project record with linked MOA and schedule. (Info: New Active Project Record)
6. System transitions project status to Ongoing.
7. System records activation event. (Info: Project Event Data)
8. Use case ends.

*7.3 System detects expired MOA (Temporal trigger, independent course)*
1. System checks linked MOA validity dates periodically. 
2. System detects expired MOA.
3. System flags active project record as MOA Expired. (Info: Flagged Project Record)
4. System notifies Director of expired MOA. (Info: MOA Expiry Alert)
5. System records detection event. (Info: Project Event Data)
6. Use case ends.

*7.4 System detects overdue report (Temporal trigger, independent course)*
1. System checks submitted reports against reporting schedule. (Info: Submitted Report Records)
2. System detects overdue report.
3. System flags active project record as Report Overdue. (Info: Flagged Project Record)
4. System notifies project leaders of overdue report. (Info: Overdue Report Alert)
5. System records detection event. (Info: Project Event Data)
6. Use case ends.

**Postconditions:**
1. Project states, updates, and flags are stored in Projects Datastore.
2. Alerts are dispatched for temporal violations.

**Exceptions:**
*E1: Special Order document missing (occurs at Alternative Course 7.1, step 3)*
1. System notifies user that documentation is incomplete.
2. System terminates use case.

*E2: Selected MOA has expired (occurs at Alternative Course 7.2, step 4)*
1. System notifies Director that selected MOA is invalid.
2. System terminates use case.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Project Implementation Updates | Director, RET Chair, Faculty | Active Project Status | Director, RET Chair, Faculty |
| Activation Request | Director | MOA Expiry Alert | Director |
| Selected MOA | Director | Overdue Report Alert | Faculty, RET Chair |
| Reporting Schedule | Director | Project Update Record | Projects Datastore |
| Special Order Documents | Director, RET Chair, Faculty | Special Order Records | Projects Datastore |
| Active Project Record | Projects Datastore | New Active Project Record | Projects Datastore |
| Approved Proposal Record | Proposals Datastore | Flagged Project Record | Projects Datastore |
| MOA Validity Dates | MOA Records Datastore | Project Event Data | Activity Logs Datastore |
| Submitted Report Records | Project Reports Datastore | | |

***

### **UC-8: Manage Project Reports**

| **Use Case Name:** Manage Project Reports | **ID:** UC-8 | **Priority:** High |
|:---|:---|:---|
| **Actor:** Faculty, RET Chair |
| **Description:** Describes how Faculty and RET Chairs submit progress reports, and how they submit the Terminal and Final Accomplishment Reports to initiate project closure. |
| **Trigger:** User submits a required report document. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. User is authenticated.
2. Active project record exists in Projects Datastore.
3. Project Reports Datastore is available and on-line.
4. Activity Logs Datastore is available and on-line.

**Normal Course:**

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. User submits progress report documents | Progress Report Documents |
| 2. System verifies active project context and schedule | Active Project Context, Project Reporting Schedule |
| 3. System validates and records progress report | Progress Report Record |
| 4. System sends report acknowledgment to user | Report Acknowledgment |
| 5. System updates project report metrics | Project Report Metrics |
| 6. System records progress report submission event | Report Event Data |

**Alternative Courses:**
*8.1 User submits closure reports (branch at step 1)*
1. User submits Terminal Report and Final Accomplishment Report documents. (Info: Terminal Report, Final Accomplishment Report)
2. System verifies active project context and schedule. 
3. System records both reports. (Info: Terminal Report Record, Final Accomplishment Report Record)
4. System updates project completion status and closes project. (Info: Project Completion Status)
5. System records closure events. (Info: Report Event Data)
6. Return to Normal Course step 4.

**Postconditions:**
1. Report records are stored in Project Reports Datastore.
2. Project closure events update the Projects Datastore.
3. Submission events are recorded in Activity Logs Datastore.

**Exceptions:**
*E1: Project reporting schedule not found (occurs at step 2)*
1. System notifies user that no reporting schedule exists for this project.
2. System terminates use case.

*E2: Missing companion document during closure (occurs at Alternative Course 8.1, step 3)*
1. System notifies user that Terminal and Final Accomplishment reports must be submitted together.
2. System terminates use case.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Progress Report Documents | Faculty, RET Chair | Report Acknowledgment | Faculty, RET Chair |
| Terminal Report | Faculty, RET Chair | Progress Report Record | Project Reports Datastore |
| Final Accomplishment Report | Faculty, RET Chair | Terminal Report Record | Project Reports Datastore |
| Active Project Context | Projects Datastore | Final Accomplishment Report Record | Project Reports Datastore |
| Project Reporting Schedule | Projects Datastore | Project Completion Status | Projects Datastore |
| | | Project Report Metrics | Project Reports Datastore |
| | | Report Event Data | Activity Logs Datastore |

***

### **UC-9: Manage Activity Logs**

| **Use Case Name:** Manage Activity Logs | **ID:** UC-9 | **Priority:** Low |
|:---|:---|:---|
| **Actor:** Super Admin |
| **Description:** Describes how the Super Admin retrieves, filters, and searches the immutable audit trails automatically generated by the system across all processes. |
| **Trigger:** Super Admin accesses the audit log module. | **Type:** ☑ External ☐ Temporal |

**Preconditions:**
1. Super Admin is authenticated.
2. Activity Logs Datastore is available and on-line.
3. System event data has been previously recorded by other use cases.

**Normal Course:**

| **Steps** | **Information for Steps** |
|:---|:---|
| 1. Super Admin submits audit log request | Audit Log Request |
| 2. System retrieves baseline audit log data | Audit Log Query |
| 3. Super Admin submits filter and search parameters | Filter And Search Parameters |
| 4. System applies parameters to refine query | Filtered Audit Log Query |
| 5. System displays filtered audit trail results | Filtered Log Results |
| 6. System records audit log access event | Audit Event Data |

**Alternative Courses:**
*9.1 Super Admin searches without filters (branch at step 3)*
1. Super Admin specifies request to view full logs without parameters.
2. System generates and displays full system audit trail data. (Info: System Audit Trail Data)
3. Return to Normal Course step 6.

**Postconditions:**
1. Audit log access event is recorded in Activity Logs Datastore.
2. Audit data is displayed to the Super Admin.

**Exceptions:**
*E1: No activity logs found (occurs at step 2)*
1. System notifies Super Admin that no activity logs exist.
2. System terminates use case.

*E2: Filter parameters return no results (occurs at step 4)*
1. System notifies Super Admin that no logs match the parameters.
2. System terminates use case.

**Summary:**

| **Inputs** | **Source** | **Outputs** | **Destination** |
|:---|:---|:---|:---|
| Audit Log Request | Super Admin | Filtered Log Results | Super Admin |
| Filter And Search Parameters | Super Admin | System Audit Trail Data | Super Admin |
| Audit Log Query | Activity Logs Datastore | Audit Event Data | Activity Logs Datastore |
| Filtered Audit Log Query | Activity Logs Datastore | | |
| User Management Event Data | Activity Logs Datastore | | |
| Access Event Data | Activity Logs Datastore | | |
| Proposal Event Data | Activity Logs Datastore | | |
| MOA Event Data | Activity Logs Datastore | | |
| Evaluation Event Data | Activity Logs Datastore | | |
| Project Event Data | Activity Logs Datastore | | |
| Report Event Data | Activity Logs Datastore | | |