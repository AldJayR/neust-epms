# Super Admin Audit Trail Compliance & Usage Guide

This guide describes how the NEUST Extension Services Project Management System (NEUST-EPMS) records, formats, and tracks critical operations for system audibility, administrative oversight, and regulatory compliance.

---

## 1. Compliance Mandate

In accordance with records management best practices and compliance frameworks (including **Republic Act No. 9470** or the *National Archives of the Philippines Act of 2007*), NEUST-EPMS maintains a permanent, tamper-resistant, and structured audit log of all critical state transitions. 

This log preserves:
*   **Accountability:** Identifies which authenticated user initiated the change.
*   **Traceability:** Establishes the exact sequence of lifecycle stages.
*   **Data Integrity:** Details the specific values changed (via structural delta comparison).

---

## 2. What the Audit Trail Tracks

The audit system records entries in the `audit_logs` table for three major domains:
1.  **Project Proposals (`proposals` table):** Submission, modification, endorsement, and approval/rejection.
2.  **Ongoing Projects (`projects` table):** Activation, status transitions (e.g., to "Ongoing" or "Completed"), and closure.
3.  **User Administration (`users` table):** Account creation, deactivation, role modification, and profile updates.

Every audit entry captures:
*   `logId`: A unique UUID.
*   `userId`: The ID of the administrator or user who performed the action.
*   `action`: A human-readable description of the operation.
*   `tableAffected`: The target database table name.
*   `oldValue`: A JSON object storing key attributes *before* the modification.
*   `newValue`: A JSON object storing key attributes *after* the modification.
*   `ipAddress`: The IPv4/IPv6 address of the client at the time of the request.
*   `createdAt`: Timestamp of the transaction.

---

## 3. Reading and Interpreting Diffs

To prevent storage bloat and ensure readability, NEUST-EPMS employs a **delta-only** serialization format. Instead of copying the entire database row, the audit trail only serializes the attributes that actually changed.

### Example: Proposal Update
If a Project Leader updates the budget of a draft proposal, the audit entry registers:

*   **`oldValue`:**
    ```json
    {
      "budgetNeust": "25000.00"
    }
    ```
*   **`newValue`:**
    ```json
    {
      "budgetNeust": "35000.00"
    }
    ```

Attributes that did not change (like the title or campus) are excluded from the `oldValue` and `newValue` JSON structures.

---

## 4. Tracked Fields Reference

The following table lists the critical columns audited by the system:

| Table | Audited Fields (Sensitive Keys) | Action Trigger |
|---|---|---|
| **`proposals`** | `title`, `budgetNeust`, `budgetPartner`, `targetStartDate`, `targetEndDate` | Proposal update (`PATCH /proposals/:id`) |
| **`projects`** | `projectStatus` | Project transition (`POST /projects/:id/transition`, `POST /projects/:id/close`) |
| **`users`** | `firstName`, `lastName`, `email`, `roleId`, `isActive`, `campusId`, `departmentId` | Profile modification (`PATCH /admin/users/:id`) |

---

## 5. Security & Verification

Audit logs are immutable. There are no API endpoints provided to modify or delete logs from the database. 

Super Admins can view the logs via the **Audit Logs** dashboard page or by querying the database directly:

```sql
SELECT 
  al.created_at, 
  u.first_name || ' ' || u.last_name as user_name, 
  al.action, 
  al.old_value, 
  al.new_value, 
  al.ip_address 
FROM audit_logs al
JOIN users u ON al.user_id = u.user_id
ORDER BY al.created_at DESC;
```
