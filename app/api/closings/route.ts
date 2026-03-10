import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { canAccessBranch } from '@/lib/auth/permissions'

// GET /api/closings - List daily closings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    const status = searchParams.get('status')

    // Build filter based on user role
    const filter: any = {}

    if (user.role === 'STAFF' || user.role === 'CHECKER') {
      // Staff and Checker can only see their own branch
      filter.branchId = user.branchId
    } else if (user.role === 'MANAGER') {
      // Manager can see branches they have access to
      if (branchId) {
        // Validate branch access for manager
        const hasAccess = await canAccessBranch(user.userId, user.role, branchId, user.branchId)
        if (!hasAccess) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'No access to this branch' } },
            { status: 403 }
          )
        }
        filter.branchId = branchId
      } else {
        // Get all branches the manager has access to
        const managerAccess = await db.managerBranchAccess.findMany({
          where: { userId: user.userId },
          select: { branchId: true }
        })
        filter.branchId = { in: managerAccess.map((a: { branchId: string }) => a.branchId) }
      }
    } else if (branchId) {
      // Owner/Audit/Admin can filter by branch
      filter.branchId = branchId
    }

    if (status) {
      filter.status = status
    }

    const closings = await db.dailyClosing.findMany({
      where: filter,
      include: {
        branch: true,
        submitter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        closingDate: 'desc',
      },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: closings,
    })
  } catch (error) {
    console.error('List closings error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch closings' },
      },
      { status: 500 }
    )
  }
}

// POST /api/closings - Create new daily closing
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Only STAFF, CHECKER, MANAGER, and OWNER can create closings
    if (!['STAFF', 'CHECKER', 'MANAGER', 'OWNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      )
    }

    const data = await request.json()

    // Validate required fields
    if (!data.closingDate) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing closingDate' },
        },
        { status: 400 }
      )
    }

    // Determine branch based on role
    let branchId: string | undefined | null

    if (user.role === 'STAFF' || user.role === 'CHECKER') {
      // Staff and Checker can only create for their branch
      branchId = user.branchId
    } else if (user.role === 'MANAGER') {
      // Manager can create for any branch they have access to
      branchId = data.branchId || user.branchId
      if (branchId) {
        const hasAccess = await canAccessBranch(user.userId, user.role, branchId, user.branchId)
        if (!hasAccess) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'No access to this branch' } },
            { status: 403 }
          )
        }
      }
    } else {
      // Owner can create for any branch
      branchId = data.branchId || user.branchId
    }

    if (!branchId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'User has no branch assigned' },
        },
        { status: 400 }
      )
    }

    // Check for duplicate (same branch + same date)
    const existing = await db.dailyClosing.findUnique({
      where: {
        branchId_closingDate: {
          branchId: branchId,
          closingDate: new Date(data.closingDate),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'DUPLICATE', message: 'มีการส่งยอดวันนี้ในสาขานี้แล้ว' },
        },
        { status: 409 }
      )
    }

    // Calculate discrepancy
    const posCreditVsEdcDiff = Math.abs(data.posCredit - data.edcTotalAmount)
    const hasDiscrepancy = posCreditVsEdcDiff > 50

    // Create closing
    const closing = await db.dailyClosing.create({
      data: {
        closingDate: new Date(data.closingDate),
        branchId: branchId,
        submittedBy: user.userId,
        status: 'DRAFT',

        // POS data
        posImageUrl: data.posImageUrl,
        posTotalSales: data.posTotalSales,
        posCash: data.posCash,
        posCredit: data.posCredit,
        posTransfer: data.posTransfer || 0,
        posExpenses: data.posExpenses,
        posStartTime: data.posStartTime,
        posEndTime: data.posEndTime,
        posBillCount: data.posBillCount,
        posAvgPerBill: data.posAvgPerBill,

        // Handwritten data
        handwrittenImageUrl: data.handwrittenImageUrl,
        handwrittenCashCount: data.handwrittenCashCount,
        handwrittenExpenses: data.handwrittenExpenses,
        handwrittenExpensesList: data.handwrittenExpensesList || [],
        handwrittenNetCash: data.handwrittenNetCash,

        // EDC data
        edcImageUrl: data.edcImageUrl,
        edcTotalAmount: data.edcTotalAmount,
        edcSettlementDate: data.edcSettlementDate ? new Date(data.edcSettlementDate) : null,
        edcBatchNumber: data.edcBatchNumber,
        edcBreakdown: data.edcBreakdown || [],

        // Validation
        hasDiscrepancy,
        posCreditVsEdcDiff,
        discrepancyRemark: data.discrepancyRemark,
      },
      include: {
        branch: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: closing,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create closing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create closing' },
      },
      { status: 500 }
    )
  }
}
