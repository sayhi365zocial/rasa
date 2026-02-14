import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

// GET /api/bank-accounts - Get all active bank accounts
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await db.companyBankAccount.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        { isDefault: 'desc' },
        { bankName: 'asc' },
      ],
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts' },
      { status: 500 }
    )
  }
}

// POST /api/bank-accounts - Create new bank account (Admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { bankName, accountNumber, accountName, bankBranch, isDefault } = body

    // Validate required fields
    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.companyBankAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const account = await db.companyBankAccount.create({
      data: {
        bankName,
        accountNumber,
        accountName,
        bankBranch,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Error creating bank account:', error)
    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 }
    )
  }
}
