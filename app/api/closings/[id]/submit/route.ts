import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const closing = await db.dailyClosing.findUnique({
      where: { id: params.id },
    })

    if (!closing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Closing not found' } },
        { status: 404 }
      )
    }

    // Check permission
    if (user.role === 'STORE_STAFF' && closing.branchId !== user.branchId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'ไม่สามารถส่งยอดสาขาอื่นได้' } },
        { status: 403 }
      )
    }

    // Can only submit DRAFT status
    if (closing.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_STATUS', message: 'สามารถส่งได้เฉพาะสถานะร่างเท่านั้น' },
        },
        { status: 400 }
      )
    }

    // Update status to SUBMITTED
    const updated = await db.dailyClosing.update({
      where: { id: params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    // Log audit
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'STATUS_CHANGE',
        entityType: 'DailyClosing',
        entityId: params.id,
        oldValue: 'DRAFT',
        newValue: 'SUBMITTED',
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Submit closing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to submit closing' },
      },
      { status: 500 }
    )
  }
}
