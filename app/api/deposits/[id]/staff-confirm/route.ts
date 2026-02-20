import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

/**
 * POST /api/deposits/[id]/staff-confirm
 * Staff reconfirms that the deposit amount matches what they submitted
 * Only staff from the same branch can confirm
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only STORE_STAFF can confirm deposits
    if (user.role !== 'STORE_STAFF') {
      return NextResponse.json(
        { error: 'เฉพาะพนักงานหน้าร้านเท่านั้นที่สามารถยืนยันการฝากเงินได้' },
        { status: 403 }
      )
    }

    const depositId = params.id
    const body = await req.json()
    const { remark } = body

    // Fetch deposit with related daily closing
    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: {
        dailyClosing: {
          include: {
            branch: true,
            submitter: true,
          },
        },
      },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการฝากเงิน' }, { status: 404 })
    }

    // Check if staff belongs to the same branch
    if (user.branchId !== deposit.dailyClosing.branchId) {
      return NextResponse.json(
        { error: 'คุณสามารถยืนยันได้เฉพาะการฝากเงินของสาขาตัวเองเท่านั้น' },
        { status: 403 }
      )
    }

    // Check if already confirmed
    if (deposit.isStaffConfirmed) {
      return NextResponse.json(
        { error: 'การฝากเงินนี้ได้รับการยืนยันจากพนักงานแล้ว' },
        { status: 400 }
      )
    }

    // Update deposit with staff confirmation
    const updatedDeposit = await db.deposit.update({
      where: { id: depositId },
      data: {
        isStaffConfirmed: true,
        staffConfirmedBy: user.userId,
        staffConfirmedAt: new Date(),
        staffConfirmRemark: remark || null,
      },
      include: {
        dailyClosing: {
          include: {
            branch: true,
          },
        },
        staffConfirmer: true,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'APPROVE',
        entityType: 'Deposit',
        entityId: depositId,
        fieldName: 'isStaffConfirmed',
        oldValue: 'false',
        newValue: 'true',
        remark: `Staff confirmed deposit for ${updatedDeposit.dailyClosing.branch.branchName} (${updatedDeposit.depositAmount} THB)${remark ? ` - ${remark}` : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDeposit,
      message: 'ยืนยันการฝากเงินเรียบร้อยแล้ว',
    })
  } catch (error) {
    console.error('Error confirming deposit (staff):', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยืนยันการฝากเงิน' },
      { status: 500 }
    )
  }
}
