import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

interface RouteParams {
  params: {
    id: string
  }
}

// PUT /api/bank-accounts/[id] - Update bank account (Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { bankName, accountNumber, accountName, bankBranch, isDefault, status } = body

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.companyBankAccount.updateMany({
        where: {
          isDefault: true,
          NOT: { id: params.id }
        },
        data: { isDefault: false },
      })
    }

    const account = await db.companyBankAccount.update({
      where: { id: params.id },
      data: {
        ...(bankName && { bankName }),
        ...(accountNumber && { accountNumber }),
        ...(accountName && { accountName }),
        ...(bankBranch !== undefined && { bankBranch }),
        ...(isDefault !== undefined && { isDefault }),
        ...(status && { status }),
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error updating bank account:', error)
    return NextResponse.json(
      { error: 'Failed to update bank account' },
      { status: 500 }
    )
  }
}

// DELETE /api/bank-accounts/[id] - Delete bank account (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft delete by setting status to INACTIVE
    await db.companyBankAccount.update({
      where: { id: params.id },
      data: { status: 'INACTIVE' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bank account:', error)
    return NextResponse.json(
      { error: 'Failed to delete bank account' },
      { status: 500 }
    )
  }
}
