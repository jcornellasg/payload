import type { PayloadHandler } from 'payload'

import { VersionConflict } from 'payload'

/**
 * Simulates two concurrent updates to demonstrate optimistic locking.
 *
 * GET  /api/posts-simulate-lock?id=<postId>
 *
 * 1. Reads the current post
 * 2. Fires two updates in parallel (simulating concurrent clients)
 * 3. One succeeds, the other fails with 409
 * 4. Returns a summary of what happened
 */
export const simulateLockHandler: PayloadHandler = async (req) => {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('id')

  if (!postId) {
    return Response.json({ error: 'Missing ?id= query param' }, { status: 400 })
  }

  // Step 1: Read
  const doc = await req.payload.findByID({
    collection: 'posts',
    id: postId,
  })

  // Step 2: Fire two concurrent updates with the SAME stale version
  const now = new Date().toISOString()
  const [resultA, resultB] = await Promise.allSettled([
    req.payload.update({
      collection: 'posts',
      id: postId,
      data: { title: `Updated by A at ${now}`, version: doc.version },
    }),
    req.payload.update({
      collection: 'posts',
      id: postId,
      data: { title: `Updated by B at ${now}`, version: doc.version },
    }),
  ])

  const results: Record<string, unknown>[] = [
    { step: 'read', version: doc.version, title: doc.title },
    {
      step: 'client-A-update',
      status: resultA.status === 'fulfilled' ? 'ok' : 'conflict',
      ...(resultA.status === 'fulfilled'
        ? { newVersion: resultA.value.version }
        : { message: resultA.reason?.message }),
    },
    {
      step: 'client-B-update',
      status: resultB.status === 'fulfilled' ? 'ok' : 'conflict',
      ...(resultB.status === 'fulfilled'
        ? { newVersion: resultB.value.version }
        : { message: resultB.reason?.message }),
    },
  ]

  // Step 3: Final state
  const final = await req.payload.findByID({
    collection: 'posts',
    id: postId,
  })
  results.push({ step: 'final', version: final.version, title: final.title })

  return Response.json({ results })
}
