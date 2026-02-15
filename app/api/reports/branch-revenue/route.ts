import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only OWNER and ADMIN can access this report
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Parse dates
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Get all branches
    const branches = await db.branch.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { branchName: 'asc' },
    })

    // Get revenue summary for each branch
    const branchRevenues = await Promise.all(
      branches.map(async (branch: typeof branches[0]) => {
        const summary = await db.dailyClosing.aggregate({
          where: {
            branchId: branch.id,
            closingDate: {
              gte: start,
              lte: end,
            },
            status: {
              in: ['SUBMITTED', 'CASH_RECEIVED', 'DEPOSITED'],
            },
          },
          _sum: {
            posTotalSales: true,
            posCash: true,
            posCredit: true,
            posTransfer: true,
            posExpenses: true,
            handwrittenCashCount: true,
          },
          _count: {
            id: true,
          },
        })

        return {
          branchId: branch.id,
          branchName: branch.branchName,
          branchCode: branch.branchCode,
          totalSales: summary._sum.posTotalSales?.toNumber() || 0,
          totalCash: summary._sum.posCash?.toNumber() || 0,
          totalCredit: summary._sum.posCredit?.toNumber() || 0,
          totalTransfer: summary._sum.posTransfer?.toNumber() || 0,
          totalExpenses: summary._sum.posExpenses?.toNumber() || 0,
          totalCashDeposit: summary._sum.handwrittenCashCount?.toNumber() || 0,
          closingCount: summary._count.id,
        }
      })
    )

    return NextResponse.json({
      branchRevenues,
      startDate,
      endDate,
    })
  } catch (error) {
    console.error('Error fetching branch revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branch revenue' },
      { status: 500 }
    )
  }
}
