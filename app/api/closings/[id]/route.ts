import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

// GET /api/closings/[id] - Get single closing details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const closing = await db.dailyClosing.findUnique({
      where: { id: params.id },
      include: {
        branch: true,
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!closing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Closing not found' } },
        { status: 404 }
      )
    }

    // Check permission
    if (user.role === 'STORE_STAFF' && closing.branchId !== user.branchId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot view other branch closings' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: closing,
    })
  } catch (error) {
    console.error('Get closing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch closing' },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/closings/[id] - Update closing (only DRAFT can be edited)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const closing = await db.dailyClosing.findUnique({
      where: { id: params.id },
    })

    if (!closing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Closing not found' } },
        { status: 404 }
      )
    }

    // Check permission
    if (user.role === 'STORE_STAFF' && closing.branchId !== user.branchId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit other branch closings' } },
        { status: 403 }
      )
    }

    // Can only edit DRAFT
    if (closing.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Can only edit draft closings' },
        },
        { status: 400 }
      )
    }

    const data = await request.json()

    // Recalculate discrepancy
    const posCreditVsEdcDiff = Math.abs(
      (data.posCredit ?? closing.posCredit.toNumber()) -
        (data.edcTotalAmount ?? closing.edcTotalAmount.toNumber())
    )
    const hasDiscrepancy = posCreditVsEdcDiff > 50

    const updated = await db.dailyClosing.update({
      where: { id: params.id },
      data: {
        ...data,
        hasDiscrepancy,
        posCreditVsEdcDiff,
      },
    })

    // Log audit
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'DailyClosing',
        entityId: params.id,
        newValue: JSON.stringify(data),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Update closing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update closing' },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/closings/[id] - Delete closing (only DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const closing = await db.dailyClosing.findUnique({
      where: { id: params.id },
    })

    if (!closing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Closing not found' } },
        { status: 404 }
      )
    }

    // Check permission
    if (user.role === 'STORE_STAFF' && closing.branchId !== user.branchId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete other branch closings' } },
        { status: 403 }
      )
    }

    // Can only delete DRAFT
    if (closing.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Can only delete draft closings' },
        },
        { status: 400 }
      )
    }

    await db.dailyClosing.delete({
      where: { id: params.id },
    })

    // Log audit
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entityType: 'DailyClosing',
        entityId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Closing deleted successfully',
    })
  } catch (error) {
    console.error('Delete closing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete closing' },
      },
      { status: 500 }
    )
  }
}
