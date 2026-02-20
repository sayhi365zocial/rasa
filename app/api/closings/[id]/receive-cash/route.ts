import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only AUDITOR, MANAGER, and ADMIN can receive cash
    if (currentUser.role !== 'AUDITOR' && currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const closingId = params.id

    // Parse request body
    const body = await request.json()
    const { discrepancyNote } = body || {}

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

    // Check for discrepancy - if there's discrepancy, require a note
    if (closing.hasDiscrepancy && !discrepancyNote) {
      return NextResponse.json(
        {
          error: 'พบความผิดปกติในยอดเงิน กรุณาระบุหมายเหตุ',
          hasDiscrepancy: true,
          posCreditVsEdcDiff: closing.posCreditVsEdcDiff?.toNumber(),
        },
        { status: 400 }
      )
    }

    // Update the closing status to CASH_RECEIVED
    const updatedClosing = await db.dailyClosing.update({
      where: { id: closingId },
      data: {
        status: 'CASH_RECEIVED',
        cashReceivedAt: new Date(),
        cashReceivedBy: currentUser.userId,
        // Update discrepancy remark if provided
        ...(discrepancyNote && { discrepancyRemark: closing.discrepancyRemark
          ? `${closing.discrepancyRemark}\n\n[Auditor Note] ${discrepancyNote}`
          : `[Auditor Note] ${discrepancyNote}`
        }),
      },
    })

    // Create audit log entry
    const auditRemark = closing.hasDiscrepancy
      ? `รับเงินจากสาขา ${closing.branch.branchName} จำนวน ${closing.handwrittenNetCash.toNumber()} บาท (มีความผิดปกติ: ${discrepancyNote || 'ไม่ระบุ'})`
      : `รับเงินจากสาขา ${closing.branch.branchName} จำนวน ${closing.handwrittenNetCash.toNumber()} บาท`

    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'STATUS_CHANGE',
        entityType: 'DailyClosing',
        entityId: closingId,
        fieldName: 'status',
        oldValue: 'SUBMITTED',
        newValue: 'CASH_RECEIVED',
        remark: auditRemark,
      },
    })

    return NextResponse.json({
      success: true,
      closing: updatedClosing,
      hasDiscrepancy: closing.hasDiscrepancy,
    })
  } catch (error) {
    console.error('Error receiving cash:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
