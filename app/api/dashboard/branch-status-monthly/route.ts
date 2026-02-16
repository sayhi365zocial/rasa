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

    // Get year and month from query string
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'กรุณาระบุปีและเดือนที่ถูกต้อง',
          },
        },
        { status: 400 }
      )
    }

    // Get start and end date of the month
    const startDate = new Date(year, month - 1, 1)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(year, month, 0)
    endDate.setHours(23, 59, 59, 999)

    const daysInMonth = endDate.getDate()

    // Get all active branches
    const branches = await db.branch.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { branchName: 'asc' },
    })

    // Get all closings for the month
    const closings = await db.dailyClosing.findMany({
      where: {
        closingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        branchId: true,
        closingDate: true,
        status: true,
        id: true,
      },
    })

    // Build status grid for each branch
    const branchStatuses = branches.map((branch: typeof branches[0]) => {
      const dailyStatuses = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        // Find closing for this branch on this day
        const closing = closings.find(
          (c: typeof closings[0]) =>
            c.branchId === branch.id &&
            c.closingDate.toISOString().split('T')[0] === dateStr
        )

        return {
          date: dateStr,
          status: closing?.status || null,
          closingId: closing?.id || null,
        }
      })

      return {
        branchId: branch.id,
        branchCode: branch.branchCode,
        branchName: branch.branchName,
        dailyStatuses,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        branchStatuses,
      },
    })
  } catch (error) {
    console.error('Get branch monthly status error:', error)
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
