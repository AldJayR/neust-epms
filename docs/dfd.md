# LEVEL 0 DFD

---

## Process 1.0 — Manage User Accounts

### Inputs
- Super Admin → 1.0 — User Role Assignments
- 2.0 → 1.0 — Pending User Record

### Outputs
- 1.0 → Super Admin — User Roster Data
- 1.0 → RET Chair — College User Roster Data
- 1.0 → Faculty — Account Status
- 1.0 → RET Chair — Account Status
- 1.0 → Super Admin — Account Status
- 1.0 → 2.0 — Provisioned User Profile
- 1.0 → 9.0 — System Event Data

---

## Process 2.0 — Manage System Access

### Inputs
- Super Admin → 2.0 — Access Data
- Director → 2.0 — Access Data
- RET Chair → 2.0 — Access Data
- Faculty → 2.0 — Access Data
- 1.0 → 2.0 — Provisioned User Profile

### Outputs
- 2.0 → Super Admin — Access Authorization
- 2.0 → Director — Access Authorization
- 2.0 → RET Chair — Access Authorization
- 2.0 → Faculty — Access Authorization
- 2.0 → Super Admin — OTP
- 2.0 → Director — OTP
- 2.0 → RET Chair — OTP
- 2.0 → Faculty — OTP
- 2.0 → Super Admin — Account Status
- 2.0 → Faculty — Account Status
- 2.0 → RET Chair — Account Status
- 2.0 → 1.0 — Pending User Record
- 2.0 → 9.0 — System Event Data

---

## Process 3.0 — Monitor Dashboard

### Inputs
- Director → 3.0 — Dashboard Query
- RET Chair → 3.0 — Dashboard Query
- Faculty → 3.0 — Dashboard Query
- 7.0 → 3.0 — Aggregated Project Data
- 8.0 → 3.0 — Project Report Metrics

### Outputs
- 3.0 → Director — Project Metrics
- 3.0 → RET Chair — College Project Metrics
- 3.0 → Faculty — Project Metrics

---

## Process 4.0 — Manage Project Proposals

### Inputs
- Faculty → 4.0 — Proposal Documents
- RET Chair → 4.0 — Proposal Documents
- 6.0 → 4.0 — Proposal Status & Feedback

### Outputs
- 4.0 → Faculty — Submission Acknowledgment
- 4.0 → RET Chair — Submission Acknowledgment
- 4.0 → 6.0 — Pending Proposal Record
- 4.0 → 9.0 — System Event Data

---

## Process 5.0 — Manage MOA Records

### Inputs
- Director → 5.0 — MOA Files & Validity Dates

### Outputs
- 5.0 → Director — MOA Status
- 5.0 → 9.0 — System Event Data

---

## Process 6.0 — Evaluate Project Proposal

### Inputs
- RET Chair → 6.0 — Evaluation Decision & Comments
- Director → 6.0 — Evaluation Decision & Comments
- Director → 6.0 — Approval Modal Request
- Director → 6.0 — Reporting Frequency
- Director → 6.0 — Reporting Dates
- 4.0 → 6.0 — Pending Proposal Record

### Outputs
- 6.0 → Faculty — Proposal Status & Feedback
- 6.0 → RET Chair — Proposal Status & Feedback
- 6.0 → Director — Proposal Status & Feedback
- 6.0 → Director — Available MOA List
- 6.0 → RET Chair — Evaluation Status
- 6.0 → Director — Evaluation Status
- 6.0 → 4.0 — Proposal Status & Feedback
- 6.0 → 9.0 — System Event Data

---

## Process 7.0 — Manage Projects

### Inputs
- RET Chair → 7.0 — Project Updates
- Director → 7.0 — Project Implementation Updates

### Outputs
- 7.0 → Director — Active Project Status
- 7.0 → RET Chair — Active Project Status
- 7.0 → 3.0 — Aggregated Project Data
- 7.0 → 9.0 — System Event Data

---

## Process 8.0 — Manage Project Reports

### Inputs
- Faculty → 8.0 — Project Report Documents
- RET Chair → 8.0 — Project Report Documents

### Outputs
- 8.0 → Faculty — Report Acknowledgment
- 8.0 → RET Chair — Report Acknowledgment
- 8.0 → 3.0 — Project Report Metrics
- 8.0 → 9.0 — System Event Data

---

## Process 9.0 — Manage Activity Logs

### Inputs
- Super Admin → 9.0 — Audit Log Request
- Super Admin → 9.0 — Filter/Search Parameters
- 1.0 → 9.0 — System Event Data
- 2.0 → 9.0 — System Event Data
- 4.0 → 9.0 — System Event Data
- 5.0 → 9.0 — System Event Data
- 6.0 → 9.0 — System Event Data
- 7.0 → 9.0 — System Event Data
- 8.0 → 9.0 — System Event Data

### Outputs
- 9.0 → Super Admin — System Audit Trail Data
- 9.0 → Super Admin — Filtered Log Results