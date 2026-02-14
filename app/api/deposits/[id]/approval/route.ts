import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only OWNER and ADMIN can approve deposits
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, remark } = body

    if (!action || !['APPROVED', 'FLAGGED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVED, FLAGGED, or REJECTED' },
        { status: 400 }
      )
    }

    // Get the deposit
    const deposit = await db.deposit.findUnique({
      where: { id: params.id },
      include: {
        dailyClosing: {
          include: {
            branch: true,
          },
        },
      },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    // Update deposit approval status
    const updatedDeposit = await db.deposit.update({
      where: { id: params.id },
      data: {
        approvalStatus: action,
        approvedBy: user.userId,
        approvedAt: new Date(),
        approvalRemark: remark || null,
      },
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: action === 'APPROVED' ? 'APPROVE' : action === 'REJECTED' ? 'REJECT' : 'UPDATE',
        entityType: 'Deposit',
        entityId: deposit.id,
        fieldName: 'approvalStatus',
        oldValue: deposit.approvalStatus,
        newValue: action,
        remark: remark,
      },
    })

    return NextResponse.json({
      success: true,
      deposit: updatedDeposit,
    })
  } catch (error) {
    console.error('Error updating deposit approval:', error)
    return NextResponse.json(
      { error: 'Failed to update deposit approval' },
      { status: 500 }
    )
  }
}
