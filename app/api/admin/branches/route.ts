import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

/**
 * GET /api/admin/branches - List all branches
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can manage branches
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const branches = await db.branch.findMany({
      include: {
        _count: {
          select: {
            users: true,
            dailyClosings: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { branchName: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: branches.map((b: typeof branches[0]) => ({
        id: b.id,
        branchCode: b.branchCode,
        branchName: b.branchName,
        address: b.address,
        phoneNumber: b.phoneNumber,
        status: b.status,
        userCount: b._count.users,
        closingCount: b._count.dailyClosings,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/branches - Create new branch
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can create branches
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      branchCode,
      branchName,
      address,
      phoneNumber,
    } = body

    // Validate required fields
    if (!branchCode || !branchName || !address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check for duplicate branchCode
    const existing = await db.branch.findUnique({
      where: { branchCode },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Branch code already exists' },
        { status: 409 }
      )
    }

    // Create branch
    const newBranch = await db.branch.create({
      data: {
        branchCode,
        branchName,
        address,
        phoneNumber: phoneNumber || null,
        status: 'ACTIVE',
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'CREATE',
        entityType: 'Branch',
        entityId: newBranch.id,
        remark: `Created branch ${newBranch.branchCode} - ${newBranch.branchName}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: newBranch,
      message: 'Branch created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    )
  }
}
