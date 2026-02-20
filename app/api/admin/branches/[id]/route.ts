import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

/**
 * PUT /api/admin/branches/[id] - Update branch
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can update branches
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const branchId = params.id
    const body = await req.json()
    const {
      branchCode,
      branchName,
      address,
      phoneNumber,
      status,
    } = body

    // Get existing branch
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    })

    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Check for duplicate branchCode (if changing)
    if (branchCode && branchCode !== existingBranch.branchCode) {
      const duplicate = await prisma.branch.findUnique({
        where: { branchCode },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Branch code already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      ...(branchCode && { branchCode }),
      ...(branchName && { branchName }),
      ...(address && { address }),
      ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
      ...(status && { status }),
    }

    // Update branch
    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: updateData,
    })

    // Create audit log
    const changes = Object.keys(updateData).join(', ')
    await createAuditLog({
      userId: currentUser.userId,
      action: 'UPDATE',
      entityType: 'Branch',
      entityId: branchId,
      remark: `Updated branch ${updatedBranch.branchCode} - Changed: ${changes}`,
    })

    return NextResponse.json({
      success: true,
      data: updatedBranch,
      message: 'Branch updated successfully',
    })
  } catch (error) {
    console.error('Error updating branch:', error)
    return NextResponse.json(
      { error: 'Failed to update branch' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/branches/[id] - Delete branch
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can delete branches
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const branchId = params.id

    // Get branch before deletion
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: {
            users: true,
            dailyClosings: true,
          },
        },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // Check if branch has users or closings
    if (branch._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete branch with existing users. Please reassign users first.' },
        { status: 400 }
      )
    }

    if (branch._count.dailyClosings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete branch with existing closing records.' },
        { status: 400 }
      )
    }

    // Delete branch
    await prisma.branch.delete({
      where: { id: branchId },
    })

    // Create audit log
    await createAuditLog({
      userId: currentUser.userId,
      action: 'DELETE',
      entityType: 'Branch',
      entityId: branchId,
      remark: `Deleted branch ${branch.branchCode} - ${branch.branchName}`,
    })

    return NextResponse.json({
      success: true,
      message: 'Branch deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting branch:', error)
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    )
  }
}
