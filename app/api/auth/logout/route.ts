import { NextResponse } from 'next/server'
import { removeAuthCookie } from '@/lib/auth/session'

export async function POST() {
  try {
    await removeAuthCookie()

    return NextResponse.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'เกิดข้อผิดพลาดในระบบ',
        },
      },
      { status: 500 }
    )
  }
}
