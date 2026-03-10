import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { hasPermission, canVerifyClosing, canAccessBranch } from '@/lib/auth/permissions'

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

    // Check if user has permission to verify closings
    if (!hasPermission(user.role, 'VERIFY_CLOSING')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
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

    // Check branch access permission
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      const hasAccess = await canAccessBranch(user.userId, user.role, closing.branchId, user.branchId)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'ไม่สามารถเช็คยอดสาขาอื่นได้' } },
          { status: 403 }
        )
      }
    }

    // Check if Checker can verify (cannot verify own submission)
    if (!canVerifyClosing(user.role, user.userId, closing.submittedBy)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Checker ไม่สามารถเช็คยอดที่ตัวเองส่งได้' } },
        { status: 403 }
      )
    }

    // Can only verify SUBMITTED status
    if (closing.status !== 'SUBMITTED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_STATUS', message: 'สามารถเช็คได้เฉพาะสถานะที่ส่งแล้วเท่านั้น' },
        },
        { status: 400 }
      )
    }

    // Update with verification tracking
    const updated = await db.dailyClosing.update({
      where: { id: params.id },
      data: {
        verifiedBy: user.userId,
        verifiedAt: new Date(),
      },
    })

    // Log audit
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'STATUS_CHANGE',
        entityType: 'DailyClosing',
        entityId: params.id,
        fieldName: 'verifiedBy',
        newValue: user.userId,
        remark: 'Closing verified',
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Verify closing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify closing' },
      },
      { status: 500 }
    )
  }
}
