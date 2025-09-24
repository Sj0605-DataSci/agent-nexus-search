📌 Database & API Design Plan
1. Tables
a) friendships
Purpose: Store friend connections and their statuses.
Columns:
id uuid pk
requester_id uuid fk -> profiles(id)
addressee_id uuid fk -> profiles(id)
status (pending, accepted, rejected)
created_at, updated_at
Constraints:
Unique (requester_id, addressee_id)
Cascade deletes
Notes:
Limit: enforce max 5 friends for free tier at API level.

b) groups
Purpose: Represent a group entity.
Columns:
id uuid pk
name text
created_by uuid fk -> profiles(id)
created_at
Optional Config:
Store default max members in config or in a group_settings table.

c) group_memberships
Purpose: Store members of groups.
Columns:
id uuid pk
group_id uuid fk -> groups(id)
profile_id uuid fk -> profiles(id)
role (member, admin)
status (pending, accepted, rejected)
joined_at
Constraints:
Unique (group_id, profile_id)
Notes:
Limit: enforce max 6 members (configurable) at API level.

d) invites
Purpose: Handle invitations for both friends & groups, including new users.
Columns:
id uuid pk
inviter_id uuid fk -> profiles(id)
invitee_email (nullable)
invitee_phone (nullable)
invite_token text unique
group_id uuid fk -> groups(id) (nullable → if null, it’s a friend invite)
status (pending, accepted, expired, cancelled)
created_at, expires_at
Notes:
Works for both friend & group invites.

2. Service/API Layer
a) Friends
POST /friendships → send friend invite (wraps invite creation).
PATCH /friendships/:id → accept/reject.
Limit Check: Before accepting, ensure count(friends) < max_allowed.

b) Groups
POST /groups → create group.
POST /groups/:id/invites → invite member (creates invite row).
PATCH /groups/:id/members/:membership_id → accept/reject.
Limit Check: Before adding a member, ensure count(members) < max_allowed.

c) Invites
POST /invites → create invite (friend or group).
GET /invites/:token → validate invite.
POST /invites/:token/accept:
If group_id = null → friendship flow.
If group_id != null → group membership flow.
Enforce limits before inserting.