/**
 * Test script for optimistic locking.
 *
 * This script demonstrates two concurrent updates to the same document.
 * Both clients read the same version, then fire updates in parallel.
 * One succeeds (version bumps), the other fails with 409.
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

  // 2. Both clients read the same version
  const clientA = await payload.findByID({
    collection: 'posts',
    id: post.id,
  })
  const clientB = await payload.findByID({
    collection: 'posts',
    id: post.id,
  })
  console.log(`\n2. Client A reads: version=${clientA.version}`)
  console.log(`   Client B reads: version=${clientB.version}`)

  // 3. Fire both updates in parallel — one must fail
  console.log('\n3. Firing concurrent updates with the same stale version...')
  const now = new Date().toISOString()

  const [resultA, resultB] = await Promise.allSettled([
    payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        title: `Updated by Client A at ${now}`,
        version: clientA.version,
      },
    }),
    payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        title: `Updated by Client B at ${now}`,
        version: clientB.version,
      },
    }),
  ])

  console.log(
    `   Client A: ${resultA.status === 'fulfilled' ? `OK (version=${resultA.value.version})` : `CONFLICT (${resultA.reason.message})`}`,
  )
  console.log(
    `   Client B: ${resultB.status === 'fulfilled' ? `OK (version=${resultB.value.version})` : `CONFLICT (${resultB.reason.message})`}`,
  )

  // 4. Final state
  const final = await payload.findByID({
    collection: 'posts',
    id: post.id,
  })
  console.log(`\n4. Final state: version=${final.version}, title="${final.title}"`)

  // 5. Verify exactly one succeeded
  const successCount = [resultA, resultB].filter((r) => r.status === 'fulfilled').length
  const conflictCount = [resultA, resultB].filter((r) => r.status === 'rejected').length
  console.log(`\n5. Summary: ${successCount} succeeded, ${conflictCount} conflicted`)

  if (successCount === 1 && conflictCount === 1) {
    console.log('   ✓ Optimistic locking is working correctly!')
  } else {
    console.log('   ✗ Expected exactly 1 success and 1 conflict')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
