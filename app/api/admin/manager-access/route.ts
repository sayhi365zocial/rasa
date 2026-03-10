import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

/**
 * GET /api/admin/manager-access - List all manager branch access records
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only OWNER can manage manager access
    if (user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const managerAccess = await db.managerBranchAccess.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        },
        branch: {
          select: {
            id: true,
            branchCode: true,
            branchName: true,
            status: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: managerAccess,
    })
  } catch (error) {
    console.error('Error fetching manager access:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manager access records' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/manager-access - Grant a manager access to a branch
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only OWNER can manage manager access
    if (currentUser.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, branchId } = body

    // Validate required fields
    if (!userId || !branchId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and branchId are required' },
        { status: 400 }
      )
    }

    // Validate that the user exists and is a MANAGER
    const managerUser = await db.user.findUnique({
      where: { id: userId },
    })

    if (!managerUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (managerUser.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'User must have MANAGER role' },
        { status: 400 }
      )
    }

    // Validate that the branch exists
    const branch = await db.branch.findUnique({
      where: { id: branchId },
    })

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }

    // Check if access already exists
    const existingAccess = await db.managerBranchAccess.findUnique({
      where: {
        userId_branchId: {
          userId,
          branchId,
        },
      },
    })

    if (existingAccess) {
      return NextResponse.json(
        { error: 'Manager already has access to this branch' },
        { status: 409 }
      )
    }

    // Create the manager branch access record
    const managerAccess = await db.managerBranchAccess.create({
      data: {
        userId,
        branchId,
        createdBy: currentUser.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        branch: {
          select: {
            id: true,
            branchCode: true,
            branchName: true,
          },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'CREATE',
        entityType: 'ManagerBranchAccess',
        entityId: managerAccess.id,
        remark: `Granted manager ${managerUser.email} access to branch ${branch.branchName} (${branch.branchCode})`,
      },
    })

    return NextResponse.json({
      success: true,
      data: managerAccess,
      message: 'Manager access granted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating manager access:', error)
    return NextResponse.json(
      { error: 'Failed to create manager access' },
      { status: 500 }
    )
  }
}
