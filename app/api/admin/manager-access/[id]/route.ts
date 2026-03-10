import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

/**
 * DELETE /api/admin/manager-access/[id] - Remove manager access to a branch
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

    // Only OWNER can manage manager access
    if (currentUser.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessId = params.id

    // Get the access record before deletion
    const managerAccess = await db.managerBranchAccess.findUnique({
      where: { id: accessId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        branch: {
          select: {
            branchCode: true,
            branchName: true,
          },
        },
      },
    })

    if (!managerAccess) {
      return NextResponse.json(
        { error: 'Manager access record not found' },
        { status: 404 }
      )
    }

    // Delete the manager branch access record
    await db.managerBranchAccess.delete({
      where: { id: accessId },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'DELETE',
        entityType: 'ManagerBranchAccess',
        entityId: accessId,
        remark: `Revoked manager ${managerAccess.user.email} access to branch ${managerAccess.branch.branchName} (${managerAccess.branch.branchCode})`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Manager access removed successfully',
    })
  } catch (error) {
    console.error('Error deleting manager access:', error)
    return NextResponse.json(
      { error: 'Failed to delete manager access' },
      { status: 500 }
    )
  }
}
