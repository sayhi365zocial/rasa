import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let currentUser
  try {
    currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only AUDIT, MANAGER, and OWNER can verify sales
    if (!hasPermission(currentUser.role, 'RECEIVE_CASH')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const closingId = params.id

    // Get the closing
    const closing = await db.dailyClosing.findUnique({
      where: { id: closingId },
      include: {
        branch: true,
      },
    })

    if (!closing) {
      return NextResponse.json({ error: 'Closing not found' }, { status: 404 })
    }

    // Check if the closing is in SUBMITTED status
    if (closing.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Closing is not in submitted status' },
        { status: 400 }
      )
    }

    // Check if already verified
    if (closing.verifiedAt) {
      return NextResponse.json(
        { error: 'Sales already verified' },
        { status: 400 }
      )
    }

    // Update the closing with verification info
    const updatedClosing = await db.dailyClosing.update({
      where: { id: closingId },
      data: {
        verifiedBy: currentUser.userId,
        verifiedAt: new Date(),
      },
    })

    // Create audit log entry
    const auditRemark = `ยืนยันยอดขายจากสาขา ${closing.branch.branchName} ยอดขายรวม ${closing.posTotalSales.toNumber()} บาท`

    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entityType: 'DailyClosing',
        entityId: closingId,
        fieldName: 'verifiedAt',
        oldValue: null,
        newValue: new Date().toISOString(),
        remark: auditRemark,
      },
    })

    return NextResponse.json({
      success: true,
      closing: updatedClosing,
    })
  } catch (error) {
    console.error('Error verifying sales:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: currentUser?.userId,
      closingId: params.id,
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
