# Optimistic Locking Example

This example demonstrates how to use Payload's optimistic locking feature to prevent lost updates from concurrent requests.

## How it works

When `optimisticLocking: true` is set on a collection:

1. Payload automatically injects a hidden `version` field (number, default: 1)
2. Clients include the `version` they read in the update data
3. The database checks `WHERE id = ? AND version = ?` atomically
4. If the version matches, the update proceeds and `version` is incremented
5. If the version doesn't match (another process updated the doc), a **409 VersionConflict** error is thrown

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Test via CLI

```bash
pnpm test:locking
```

This runs `src/test-locking.ts` which:
1. Creates a post
2. Two clients read the same version (version=1)
3. Both fire updates in parallel via `Promise.allSettled`
4. One succeeds (version bumps to 2), the other gets a 409 conflict
5. Final state shows the successful update

## Test via REST

```bash
# First create a post via the admin panel or API, then:
curl http://localhost:3000/api/posts-simulate-lock?id=<postId>
```

The endpoint fires two concurrent updates and returns which one conflicted.

## Collections

- **Posts** — `optimisticLocking: true` → version control enabled
- **Comments** — no `optimisticLocking` → no version control
