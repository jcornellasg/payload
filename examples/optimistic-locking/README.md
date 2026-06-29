# Optimistic Locking Example

This example demonstrates how to use Payload's optimistic locking feature to prevent lost updates from concurrent requests.

## How it works

When `optimisticLocking: true` is set on a collection:

1. Payload automatically injects a hidden `version` field (number, default: 1)
2. On every update, the database checks `WHERE id = ? AND version = ?` atomically
3. If the version matches, the update proceeds and `version` is incremented
4. If the version doesn't match (another process updated the doc), a **409 VersionConflict** error is thrown

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
2. Two clients read the same version
3. Client A updates → succeeds (version 1 → 2)
4. Client B updates with stale version → fails with 409
5. Client B re-reads and retries → succeeds

## Test via REST

```bash
# First create a post via the admin panel or API, then:
curl http://localhost:3000/api/posts-simulate-lock?id=<postId>
```

## Collections

- **Posts** — `optimisticLocking: true` → version control enabled
- **Comments** — no `optimisticLocking` → no version control
