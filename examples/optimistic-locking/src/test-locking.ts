/**
 * Test script for optimistic locking.
 *
 * This script demonstrates two concurrent updates to the same document.
 * The first update succeeds (version 1 → 2).
 * The second update fails with a 409 VersionConflict because the version
 * no longer matches (still has version 1, but DB is now at 2).
 *
 * Usage: pnpm test:locking
 */
import { getPayload } from 'payload'

import config from './payload.config'

async function main() {
  const payload = await getPayload({ config })

  // 1. Create a post
  console.log('1. Creating post...')
  const post = await payload.create({
    collection: 'posts',
    data: {
      title: 'Original title',
      content: 'Original content',
    },
  })
  console.log(`   Created post id=${post.id}, version=${post.version}`)

  // 2. Read the post (simulates client A reading)
  const clientA = await payload.findByID({
    collection: 'posts',
    id: post.id,
  })
  console.log(`\n2. Client A reads: version=${clientA.version}`)

  // 3. Read the post (simulates client B reading the same version)
  const clientB = await payload.findByID({
    collection: 'posts',
    id: post.id,
  })
  console.log(`   Client B reads: version=${clientB.version}`)

  // 4. Client A updates first — should succeed
  console.log('\n3. Client A updates (should succeed)...')
  try {
    const updatedByA = await payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        title: 'Updated by Client A',
        version: clientA.version,
      },
    })
    console.log(`   OK → version=${updatedByA.version}, title="${updatedByA.title}"`)
  } catch (err) {
    console.log(`   ERROR: ${err.message}`)
  }

  // 5. Client B updates with stale version — should fail
  console.log('\n4. Client B updates with stale version (should fail with 409)...')
  try {
    const updatedByB = await payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        title: 'Updated by Client B',
        version: clientB.version,
      },
    })
    console.log(`   UNEXPECTED SUCCESS → version=${updatedByB.version}`)
  } catch (err) {
    console.log(`   Expected error: ${err.message} (status=${err.status || 'unknown'})`)
  }

  // 6. Client B re-reads and retries — should succeed
  console.log('\n5. Client B re-reads and retries (should succeed)...')
  const freshB = await payload.findByID({
    collection: 'posts',
    id: post.id,
  })
  console.log(`   Re-read: version=${freshB.version}`)
  try {
    const retriedByB = await payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        title: 'Updated by Client B (retry)',
        version: freshB.version,
      },
    })
    console.log(`   OK → version=${retriedByB.version}, title="${retriedByB.title}"`)
  } catch (err) {
    console.log(`   ERROR: ${err.message}`)
  }

  // 7. Show final state
  const final = await payload.findByID({
    collection: 'posts',
    id: post.id,
  })
  console.log(`\n6. Final state: version=${final.version}, title="${final.title}"`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
