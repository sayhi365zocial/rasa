import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
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

    // Only AUDITOR, MANAGER, and ADMIN can create deposits
    if (currentUser.role !== 'AUDITOR' && currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
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

    const {
      closingId,
      depositSlipUrl,
      depositDate,
      bankName,
      accountNumber,
      bankBranch,
    } = await request.json()

    // Validate input
    if (!closingId || !depositSlipUrl || !depositDate || !bankName || !accountNumber) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
          },
        },
        { status: 400 }
      )
    }

    // Get the daily closing
    const dailyClosing = await db.dailyClosing.findUnique({
      where: { id: closingId },
      include: {
        branch: true,
      },
    })

    if (!dailyClosing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ไม่พบรายการปิดยอด',
          },
        },
        { status: 404 }
      )
    }

    // Check if closing is in CASH_RECEIVED status
    if (dailyClosing.status !== 'CASH_RECEIVED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'รายการปิดยอดต้องอยู่ในสถานะรับเงินแล้วเท่านั้น',
          },
        },
        { status: 400 }
      )
    }

    // Create deposit record
    const deposit = await db.deposit.create({
      data: {
        dailyClosingId: closingId,
        depositSlipUrl,
        depositAmount: dailyClosing.handwrittenNetCash,
        depositDate: new Date(depositDate),
        bankName,
        accountNumber,
        bankBranch: bankBranch || null,
        amountMatched: true, // Default to true, can be changed later
        depositedBy: currentUser.userId,
        depositedAt: new Date(),
        approvalStatus: 'PENDING',
      },
    })

    // Update daily closing status to DEPOSITED
    await db.dailyClosing.update({
      where: { id: closingId },
      data: {
        status: 'DEPOSITED',
        completedAt: new Date(),
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'CREATE',
        entityType: 'Deposit',
        entityId: deposit.id,
        fieldName: 'status',
        oldValue: null,
        newValue: 'PENDING',
        remark: `นำฝากเงินจากสาขา ${dailyClosing.branch.branchName} จำนวน ${dailyClosing.handwrittenNetCash.toNumber()} บาท`,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        deposit: {
          id: deposit.id,
          depositDate: deposit.depositDate,
          depositAmount: deposit.depositAmount.toNumber(),
          bankName: deposit.bankName,
          accountNumber: deposit.accountNumber,
          approvalStatus: deposit.approvalStatus,
        },
      },
    })
  } catch (error) {
    console.error('Create deposit error:', error)
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

    const deposits = await db.deposit.findMany({
      include: {
        dailyClosing: {
          include: {
            branch: true,
          },
        },
        depositor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        depositDate: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        deposits: deposits.map((deposit: typeof deposits[0]) => ({
          id: deposit.id,
          depositDate: deposit.depositDate,
          depositAmount: deposit.depositAmount.toNumber(),
          bankName: deposit.bankName,
          accountNumber: deposit.accountNumber,
          approvalStatus: deposit.approvalStatus,
          branch: {
            branchName: deposit.dailyClosing.branch.branchName,
            branchCode: deposit.dailyClosing.branch.branchCode,
          },
          depositor: {
            firstName: deposit.depositor.firstName,
            lastName: deposit.depositor.lastName,
          },
        })),
      },
    })
  } catch (error) {
    console.error('Get deposits error:', error)
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
