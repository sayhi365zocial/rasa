import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * POST /api/deposits/[id]/bank-confirm
 * Owner confirms that money has been received in bank account
 * This is different from approval - it confirms actual receipt
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

    // Only OWNER or ADMIN can confirm bank receipt
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'เฉพาะเจ้าของหรือผู้ดูแลระบบเท่านั้นที่สามารถยืนยันการรับเงินเข้าบัญชีได้' },
        { status: 403 }
      )
    }

    const depositId = params.id
    const body = await req.json()
    const { actualDepositAmount, remark } = body

    // Validate actualDepositAmount
    if (actualDepositAmount === undefined || actualDepositAmount === null) {
      return NextResponse.json(
        { error: 'กรุณาระบุยอดเงินที่เข้าบัญชีจริง' },
        { status: 400 }
      )
    }

    if (actualDepositAmount < 0) {
      return NextResponse.json(
        { error: 'ยอดเงินต้องมากกว่าหรือเท่ากับ 0' },
        { status: 400 }
      )
    }

    // Fetch deposit
    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: {
        dailyClosing: {
          include: {
            branch: true,
          },
        },
      },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการฝากเงิน' }, { status: 404 })
    }

    // Check if deposit has been approved first
    if (deposit.approvalStatus !== 'APPROVED' && deposit.approvalStatus !== 'BANK_CONFIRMED') {
      return NextResponse.json(
        { error: 'ต้องอนุมัติการฝากเงินก่อนจึงจะสามารถยืนยันการรับเงินเข้าบัญชีได้' },
        { status: 400 }
      )
    }

    // Check if already confirmed
    if (deposit.isBankConfirmed) {
      return NextResponse.json(
        { error: 'การฝากเงินนี้ได้รับการยืนยันการรับเงินเข้าบัญชีแล้ว' },
        { status: 400 }
      )
    }

    // Update deposit with bank confirmation
    const updatedDeposit = await db.deposit.update({
      where: { id: depositId },
      data: {
        isBankConfirmed: true,
        bankConfirmedBy: user.userId,
        bankConfirmedAt: new Date(),
        actualDepositAmount: new Prisma.Decimal(actualDepositAmount),
        bankConfirmRemark: remark || null,
        approvalStatus: 'BANK_CONFIRMED', // Update status to BANK_CONFIRMED
      },
      include: {
        dailyClosing: {
          include: {
            branch: true,
          },
        },
        bankConfirmer: true,
      },
    })

    // Check if there's a variance
    const variance = Number(updatedDeposit.actualDepositAmount) - Number(updatedDeposit.depositAmount)
    const varianceMessage = variance !== 0
      ? ` (ผลต่าง: ${variance > 0 ? '+' : ''}${variance.toFixed(2)} THB)`
      : ''

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'APPROVE',
        entityType: 'Deposit',
        entityId: depositId,
        fieldName: 'isBankConfirmed',
        oldValue: 'false',
        newValue: 'true',
        remark: `Owner confirmed bank receipt for ${updatedDeposit.dailyClosing.branch.branchName} - Amount: ${actualDepositAmount} THB${varianceMessage}${remark ? ` - ${remark}` : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDeposit,
      message: 'ยืนยันการรับเงินเข้าบัญชีเรียบร้อยแล้ว',
      variance: variance !== 0 ? variance : undefined,
    })
  } catch (error) {
    console.error('Error confirming bank receipt:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยืนยันการรับเงินเข้าบัญชี' },
      { status: 500 }
    )
  }
}
