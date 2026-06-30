import React from 'react'

export const metadata = {
  description: 'Payload optimistic locking example.',
  title: 'Optimistic Locking Example',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
