'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GroupChatRoot() {
  const router = useRouter()
  useEffect(() => { router.replace('/home/groupchat/lobby') }, [])
  return null
}
