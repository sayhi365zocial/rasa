import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json()

    // Validate input
    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'กรุณากรอกอีเมลและรหัสผ่าน',
          },
        },
        { status: 400 }
      )
    }

    // Find user by email or username
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
        status: 'ACTIVE',
      },
      include: {
        branch: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
          },
        },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
          },
        },
        { status: 401 }
      )
    }

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    })

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          branchId: user.branchId,
          branch: user.branch
            ? {
                id: user.branch.id,
                branchCode: user.branch.branchCode,
                branchName: user.branch.branchName,
              }
            : null,
        },
        accessToken: token,
        expiresIn: 7 * 24 * 60 * 60,
      },
    })

    // Set HTTP-Only Cookie
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'เกิดข้อผิดพลาดในระบบ',
          details: process.env.NODE_ENV === 'development'
            ? (error instanceof Error ? error.message : String(error))
            : undefined,
        },
      },
      { status: 500 }
    )
  }
}
