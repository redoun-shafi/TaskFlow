# TaskFlow Security Specification

## 1. Data Invariants

1. **User Invariant**: A user document at `/users/{userId}` can only be read or created/modified by the authenticated user whose `request.auth.uid == userId`.
2. **Team Boundary Invariant**: A user cannot read, create, update, or delete tasks, comments, activity logs, or team member records unless they are a validated member of the corresponding team (`request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.memberIds` or explicitly recorded in `teamMembers`).
3. **Role Escalation Invariant**: A standard member cannot promote themselves to `ADMIN` or `OWNER`. Only an `OWNER` or `ADMIN` can invite, modify roles, or remove members.
4. **Owner Protection Invariant**: A team's `ownerId` cannot be changed arbitrarily. Only the current owner can transfer ownership.
5. **Task Author/Assignee Invariant**: A task can only be created by an authenticated member of the team, with `creatorId == request.auth.uid`.
6. **Task Mutation Guard**: Only team members can edit tasks. Non-members cannot modify any task field.
7. **Comment Authenticity Invariant**: A comment's `authorId` must strictly equal `request.auth.uid`. A user can only edit or delete their own comment.
8. **Notification Privacy Invariant**: A notification document at `/notifications/{id}` can only be read or updated (e.g. marked as read) by the recipient user where `resource.data.userId == request.auth.uid`.
9. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Ghost User Profile Injection)**: Attacker attempts to overwrite `/users/victimUid` with attacker's email and role. (Fails: `request.auth.uid != victimUid`).
2. **Payload 2 (Self-Promote to Team Owner)**: Attacker submits an update to `/teamMembers/{teamId}_{attackerUid}` setting `role: "OWNER"` without being owner. (Fails: role changes require Owner or Admin rights).
3. **Payload 3 (Cross-Tenant Task Snooping)**: Attacker attempts `get` or `list` on `/tasks` where `teamId == "secret-team"` which attacker does not belong to. (Fails: must belong to `memberIds`).
4. **Payload 4 (Orphaned Task Creation)**: Attacker sends a task creation with `teamId: "nonexistent-team"`. (Fails: `exists()` check verifies team presence).
5. **Payload 5 (Author Impersonation in Tasks)**: Attacker sets `creatorId: "ceoUid"` when creating a task. (Fails: `incoming().creatorId == request.auth.uid`).
6. **Payload 6 (Comment Spoofing)**: Attacker submits comment with `authorId: "anotherUser"`. (Fails: `incoming().authorId == request.auth.uid`).
7. **Payload 7 (Comment Vandalism)**: Attacker tries to delete another user's comment. (Fails: `resource.data.authorId == request.auth.uid`).
8. **Payload 8 (Private Notification Scraping)**: Attacker queries `/notifications` without scoping to their own UID. (Fails: `resource.data.userId == request.auth.uid`).
9. **Payload 9 (Oversized Payload / Denial of Wallet)**: Attacker sends a task title of 500,000 characters. (Fails: `.size() <= 200`).
10. **Payload 10 (Timestamp Backdating)**: Attacker sets `createdAt: timestamp(1990-01-01)`. (Fails: must equal `request.time`).
11. **Payload 11 (Unauthorized Team Deletion)**: A standard `MEMBER` calls delete on `/teams/{teamId}`. (Fails: only `ownerId` can delete team).
12. **Payload 12 (Shadow Field Injection)**: Attacker appends `isSuperAdmin: true` to a task or user payload. (Fails: `hasOnly` strict key validation).
