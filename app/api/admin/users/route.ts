import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'

/**
 * GET /api/admin/users - List all users
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only OWNER and ADMIN can manage users
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await db.user.findMany({
      include: {
        branch: true,
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { role: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: users.map((u: typeof users[0]) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phoneNumber,
        role: u.role,
        status: u.status,
        branchId: u.branchId,
        branch: u.branch ? {
          id: u.branch.id,
          branchCode: u.branch.branchCode,
          branchName: u.branch.branchName,
        } : null,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users - Create new user
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only OWNER and ADMIN can create users
    if (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      phoneNumber,
      role,
      branchId,
    } = body

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['STAFF', 'AUDIT', 'MANAGER', 'OWNER', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Validate branchId for STAFF
    if (role === 'STAFF' && !branchId) {
      return NextResponse.json(
        { error: 'Branch is required for STAFF role' },
        { status: 400 }
      )
    }

    // Check for duplicate email
    const existingEmail = await db.user.findUnique({
      where: { email },
    })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }

    // Check for duplicate username
    const existingUsername = await db.user.findUnique({
      where: { username },
    })
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await db.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
        role,
        status: 'ACTIVE',
        branchId: role === 'STAFF' ? branchId : null,
      },
      include: {
        branch: true,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'CREATE',
        entityType: 'User',
        entityId: newUser.id,
        remark: `Created user ${newUser.email} with role ${newUser.role}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        status: newUser.status,
        branchId: newUser.branchId,
        branch: newUser.branch,
      },
      message: 'User created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
