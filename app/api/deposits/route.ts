import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only AUDITOR and ADMIN can create deposits
    if (currentUser.role !== 'AUDITOR' && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      closingId,
      bankName,
      accountNumber,
      depositDate,
      depositSlipUrl,
    } = body

    // Validate required fields
    if (
      !closingId ||
      !bankName ||
      !accountNumber ||
      !depositDate ||
      !depositSlipUrl
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    // Check if the closing is in CASH_RECEIVED status
    if (closing.status !== 'CASH_RECEIVED') {
      return NextResponse.json(
        { error: 'Closing is not ready for deposit' },
        { status: 400 }
      )
    }

    // Create deposit record and update closing status in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create deposit record
      const deposit = await tx.deposit.create({
        data: {
          dailyClosingId: closingId,
          bankName,
          accountNumber,
          depositDate: new Date(depositDate),
          depositAmount: closing.handwrittenNetCash,
          depositSlipUrl,
          depositedBy: currentUser.userId,
          depositedAt: new Date(),
          amountMatched: true,
        },
      })

      // Update closing status to DEPOSITED
      const updatedClosing = await tx.dailyClosing.update({
        where: { id: closingId },
        data: {
          status: 'DEPOSITED',
          completedAt: new Date(),
        },
      })

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'STATUS_CHANGE',
          entityType: 'DailyClosing',
          entityId: closingId,
          fieldName: 'status',
          oldValue: 'CASH_RECEIVED',
          newValue: 'DEPOSITED',
          remark: `นำฝากเงินจากสาขา ${closing.branch.branchName} จำนวน ${closing.handwrittenNetCash.toNumber()} บาท เข้าบัญชี ${bankName} ${accountNumber}`,
        },
      })

      return { deposit, closing: updatedClosing }
    })

    return NextResponse.json({
      success: true,
      deposit: result.deposit,
      closing: result.closing,
    })
  } catch (error) {
    console.error('Error creating deposit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const bankName = searchParams.get('bankName')

    // Build filter conditions
    const where: any = {}

    if (startDate || endDate) {
      where.depositDate = {}
      if (startDate) {
        where.depositDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.depositDate.lte = new Date(endDate)
      }
    }

    if (bankName) {
      where.bankName = {
        contains: bankName,
        mode: 'insensitive',
      }
    }

    // Get deposits with filters
    const deposits = await db.deposit.findMany({
      where,
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

    return NextResponse.json({ deposits })
  } catch (error) {
    console.error('Error fetching deposits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
