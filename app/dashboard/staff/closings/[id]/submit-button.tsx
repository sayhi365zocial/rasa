'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SubmitButton({ closingId }: { closingId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/closings/${closingId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        alert(data.error?.message || 'เกิดข้อผิดพลาดในการส่งยอด')
        setIsSubmitting(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard/staff')
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      alert('เกิดข้อผิดพลาดในการส่งยอด')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'กำลังส่ง...' : 'ส่งยอด'}
      </button>
    </form>
  )
}
