import type { PayloadHandler } from 'payload'

import { VersionConflict } from 'payload'

/**
 * Simulates two concurrent updates to demonstrate optimistic locking.
 *
 * GET  /api/posts-simulate-lock?id=<postId>
 *
 * 1. Reads the current post
 * 2. Updates it (simulates client A)
 * 3. Tries to update again with the OLD version (simulates client B)
 * 4. Returns a summary of what happened
 */
export const simulateLockHandler: PayloadHandler = async (req) => {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('id')

  if (!postId) {
    return Response.json({ error: 'Missing ?id= query param' }, { status: 400 })
  }

  const results: Record<string, unknown>[] = []

  // Step 1: Read
  const doc = await req.payload.findByID({
    collection: 'posts',
    id: postId,
  })
  results.push({ step: 'read', version: doc.version, title: doc.title })

  // Step 2: Client A updates (should succeed)
  try {
    const updated = await req.payload.update({
      collection: 'posts',
      id: postId,
      data: { title: `Updated by A at ${new Date().toISOString()}`, version: doc.version },
    })
    results.push({ step: 'client-A-update', status: 'ok', newVersion: updated.version })
  } catch (err) {
    results.push({ step: 'client-A-update', status: 'error', message: err.message })
  }

  // Step 3: Client B updates with stale version (should fail)
  try {
    await req.payload.update({
      collection: 'posts',
      id: postId,
      data: { title: `Updated by B at ${new Date().toISOString()}`, version: doc.version },
    })
    results.push({ step: 'client-B-update', status: 'unexpected-success' })
  } catch (err) {
    results.push({
      step: 'client-B-update',
      status: 'expected-conflict',
      message: err.message,
      httpStatus: err.status,
    })
  }

  // Step 4: Final state
  const final = await req.payload.findByID({
    collection: 'posts',
    id: postId,
  })
  results.push({ step: 'final', version: final.version, title: final.title })

  return Response.json({ results })
}
