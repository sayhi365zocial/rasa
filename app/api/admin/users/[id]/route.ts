import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'

/**
 * PUT /api/admin/users/[id] - Update user
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

    // Only ADMIN can update users
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.id
    const body = await req.json()
    const {
      email,
      username,
      password, // Optional
      firstName,
      lastName,
      phoneNumber,
      role,
      status,
      branchId,
    } = body

    // Get existing user
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['STORE_STAFF', 'AUDITOR', 'MANAGER', 'OWNER', 'ADMIN']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        )
      }

      // Validate branchId for STORE_STAFF
      if (role === 'STORE_STAFF' && !branchId) {
        return NextResponse.json(
          { error: 'Branch is required for STORE_STAFF role' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate email (if changing)
    if (email && email !== existingUser.email) {
      const duplicateEmail = await db.user.findUnique({
        where: { email },
      })
      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    // Check for duplicate username (if changing)
    if (username && username !== existingUser.username) {
      const duplicateUsername = await db.user.findUnique({
        where: { username },
      })
      if (duplicateUsername) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      ...(email && { email }),
      ...(username && { username }),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
      ...(role && { role }),
      ...(status && { status }),
    }

    // Handle branchId based on role
    if (role) {
      if (role === 'STORE_STAFF') {
        updateData.branchId = branchId
      } else {
        updateData.branchId = null
      }
    }

    // Hash password if provided
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        branch: true,
      },
    })

    // Create audit log
    const changes = Object.keys(updateData).filter(k => k !== 'passwordHash').join(', ')
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: userId,
        remark: `Updated user ${updatedUser.email} - Changed: ${changes}${password ? ', password' : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        status: updatedUser.status,
        branchId: updatedUser.branchId,
        branch: updatedUser.branch,
      },
      message: 'User updated successfully',
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id] - Delete user
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

    // Only ADMIN can delete users
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.id

    // Cannot delete yourself
    if (userId === currentUser.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get user before deletion
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user
    await db.user.delete({
      where: { id: userId },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'DELETE',
        entityType: 'User',
        entityId: userId,
        remark: `Deleted user ${user.email} (${user.role})`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
