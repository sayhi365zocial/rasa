import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

const CONFIG_KEY = 'credit_card_fee_rate'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'กรุณาเข้าสู่ระบบ',
          },
        },
        { status: 401 }
      )
    }

    // Get config from database
    const config = await db.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    })

    const feeRate = config ? parseFloat(config.value) : 2.5 // Default 2.5%

    return NextResponse.json({
      success: true,
      data: {
        feeRate,
      },
    })
  } catch (error) {
    console.error('Get credit card fee error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'เกิดข้อผิดพลาดในระบบ',
        },
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'กรุณาเข้าสู่ระบบ',
          },
        },
        { status: 401 }
      )
    }

    // Only ADMIN can update
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
          },
        },
        { status: 403 }
      )
    }

    const { feeRate } = await request.json()

    // Validate input
    if (typeof feeRate !== 'number' || feeRate < 0 || feeRate > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'กรุณากรอกค่าธรรมเนียมระหว่าง 0-100%',
          },
        },
        { status: 400 }
      )
    }

    // Upsert config
    const config = await db.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: {
        value: feeRate.toString(),
        updatedAt: new Date(),
      },
      create: {
        key: CONFIG_KEY,
        value: feeRate.toString(),
        description: 'อัตราค่าธรรมเนียมบัตรเครดิต (%)',
        dataType: 'number',
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entityType: 'SystemConfig',
        entityId: config.id,
        fieldName: 'credit_card_fee_rate',
        oldValue: null,
        newValue: feeRate.toString(),
        remark: `อัปเดตค่าธรรมเนียมบัตรเครดิตเป็น ${feeRate}%`,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        feeRate,
      },
    })
  } catch (error) {
    console.error('Update credit card fee error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'เกิดข้อผิดพลาดในระบบ',
        },
      },
      { status: 500 }
    )
  }
}
