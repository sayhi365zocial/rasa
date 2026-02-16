import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'กรุณาเข้าสู่ระบบ',
          },
        },
        { status: 401 }
      )
    }

    // Only AUDITOR, OWNER, and ADMIN can access
    if (
      currentUser.role !== 'AUDITOR' &&
      currentUser.role !== 'OWNER' &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
          },
        },
        { status: 403 }
      )
    }

    // Get date from query string
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'กรุณาระบุวันที่',
          },
        },
        { status: 400 }
      )
    }

    // Parse date
    const selectedDate = new Date(dateParam)
    selectedDate.setHours(0, 0, 0, 0)

    // Get all active branches
    const branches = await db.branch.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { branchName: 'asc' },
    })

    // Get closing status for each branch on the selected date
    const branchStatuses = await Promise.all(
      branches.map(async (branch: typeof branches[0]) => {
        const closing = await db.dailyClosing.findFirst({
          where: {
            branchId: branch.id,
            closingDate: selectedDate,
          },
          select: {
            id: true,
            status: true,
            submittedAt: true,
          },
        })

        return {
          branchId: branch.id,
          branchCode: branch.branchCode,
          branchName: branch.branchName,
          status: closing?.status || null,
          closingId: closing?.id || null,
          submittedAt: closing?.submittedAt || null,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        date: selectedDate,
        branchStatuses,
      },
    })
  } catch (error) {
    console.error('Get branch status error:', error)
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
