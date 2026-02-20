import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { generateDailySummaryEmail, generatePlainTextSummary } from '@/lib/email/templates'
import { sendDailySummaryToOwner } from '@/lib/email/sender'

/**
 * POST /api/admin/notifications/daily-summary
 * Send daily summary email to all owners
 * Can be called manually or via cron job
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    // Allow ADMIN to manually trigger, or allow cron job with API key
    const apiKey = req.headers.get('x-api-key')
    const isValidCron = apiKey === process.env.CRON_API_KEY

    if (!user && !isValidCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get date to summarize (default to yesterday)
    const body = await req.json().catch(() => ({}))
    const targetDate = body.date ? new Date(body.date) : new Date()

    // Set to yesterday if no date provided
    if (!body.date) {
      targetDate.setDate(targetDate.getDate() - 1)
    }
    targetDate.setHours(0, 0, 0, 0)

    const endDate = new Date(targetDate)
    endDate.setHours(23, 59, 59, 999)

    // Get all owners
    const owners = await db.user.findMany({
      where: {
        role: 'OWNER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (owners.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active owners found',
      })
    }

    // Get all branches
    const branches = await db.branch.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { branchName: 'asc' },
    })

    // Get daily closings for the date
    const dailyClosings = await db.dailyClosing.findMany({
      where: {
        closingDate: {
          gte: targetDate,
          lte: endDate,
        },
      },
      include: {
        branch: true,
      },
    })

    // Get deposits for the date
    const deposits = await db.deposit.findMany({
      where: {
        depositDate: {
          gte: targetDate,
          lte: endDate,
        },
      },
      include: {
        dailyClosing: {
          include: {
            branch: true,
          },
        },
      },
    })

    // Calculate summary
    const summary = {
      totalSales: dailyClosings.reduce((sum: number, c: typeof dailyClosings[0]) => sum + Number(c.posTotalSales), 0),
      totalCashCollected: dailyClosings
        .filter((c: typeof dailyClosings[0]) => c.status !== 'DRAFT')
        .reduce((sum: number, c: typeof dailyClosings[0]) => sum + Number(c.handwrittenNetCash), 0),
      totalDeposited: deposits
        .filter((d: typeof deposits[0]) => d.approvalStatus === 'APPROVED' || d.approvalStatus === 'BANK_CONFIRMED')
        .reduce((sum: number, d: typeof deposits[0]) => sum + Number(d.depositAmount), 0),
      pendingCollection: dailyClosings.filter((c: typeof dailyClosings[0]) => c.status === 'SUBMITTED').length,
      pendingDeposit: dailyClosings.filter((c: typeof dailyClosings[0]) => c.status === 'CASH_RECEIVED').length,
    }

    // Prepare branch data
    const branchData = branches.map((branch: typeof branches[0]) => {
      const closing = dailyClosings.find((c: typeof dailyClosings[0]) => c.branchId === branch.id)

      return {
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        totalSales: closing ? Number(closing.posTotalSales) : 0,
        cashCollected: closing ? Number(closing.handwrittenNetCash) : 0,
        status: closing
          ? (closing.status === 'SUBMITTED' ? 'submitted' as const :
             closing.status === 'CASH_RECEIVED' ? 'collected' as const :
             closing.status === 'DEPOSITED' ? 'deposited' as const :
             'pending' as const)
          : 'pending' as const,
      }
    })

    // Prepare deposit data
    const depositData = deposits.map((d: typeof deposits[0]) => ({
      branchName: d.dailyClosing.branch.branchName,
      amount: Number(d.depositAmount),
      status: d.approvalStatus,
      bankName: d.bankName,
    }))

    // Detect issues
    const issues: Array<{ branchName: string; issue: string; severity: 'low' | 'medium' | 'high' }> = []

    // Check for branches with no submission
    branches.forEach((branch: typeof branches[0]) => {
      const hasClosing = dailyClosings.some((c: typeof dailyClosings[0]) => c.branchId === branch.id)
      if (!hasClosing) {
        issues.push({
          branchName: branch.branchName,
          issue: 'ยังไม่ได้ส่งยอด',
          severity: 'high',
        })
      }
    })

    // Check for discrepancies
    dailyClosings.forEach((closing: typeof dailyClosings[0]) => {
      if (closing.hasDiscrepancy) {
        issues.push({
          branchName: closing.branch.branchName,
          issue: `พบความผิดปกติในยอดเงิน (ผลต่าง ${closing.posCreditVsEdcDiff} บาท)`,
          severity: 'medium',
        })
      }
    })

    // Generate email content
    const emailData = {
      date: targetDate,
      branches: branchData,
      summary,
      deposits: depositData,
      issues,
    }

    const htmlContent = generateDailySummaryEmail(emailData)
    const textContent = generatePlainTextSummary(emailData)

    // Send email to all owners
    const results = await Promise.all(
      owners.map(async (owner: typeof owners[0]) => {
        const sent = await sendDailySummaryToOwner(
          owner.email,
          htmlContent,
          textContent
        )
        return { owner: owner.email, sent }
      })
    )

    const successCount = results.filter((r: typeof results[0]) => r.sent).length

    return NextResponse.json({
      success: true,
      message: `Daily summary sent to ${successCount}/${owners.length} owners`,
      results,
      summary: {
        date: targetDate,
        totalSales: summary.totalSales,
        totalCashCollected: summary.totalCashCollected,
        totalDeposited: summary.totalDeposited,
        pendingCollection: summary.pendingCollection,
        pendingDeposit: summary.pendingDeposit,
        issuesFound: issues.length,
      },
    })
  } catch (error) {
    console.error('Error sending daily summary:', error)
    return NextResponse.json(
      { error: 'Failed to send daily summary' },
      { status: 500 }
    )
  }
}
