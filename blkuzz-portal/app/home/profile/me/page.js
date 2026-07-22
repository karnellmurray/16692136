'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function MeRedirect() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user?.username) {
      router.replace(`/home/profile/${session.user.username}`)
    }
  }, [session, router])

  return null
}
