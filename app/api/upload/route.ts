import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, generateFileKey } from '@/lib/storage/r2'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'File must be an image' } },
        { status: 400 }
      )
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size must be less than 10MB' } },
        { status: 400 }
      )
    }

    // Get user's branch
    const userRecord = await db.user.findUnique({
      where: { id: user.userId },
      include: { branch: true },
    })

    if (!userRecord || !userRecord.branch) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_BRANCH', message: 'User has no branch assigned' } },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate key and upload
    const today = new Date().toISOString().split('T')[0]
    const extension = file.name.split('.').pop() || 'jpg'
    const key = generateFileKey(
      type as any,
      userRecord.branch.branchCode,
      today,
      extension
    )

    const url = await uploadToR2(buffer, key, file.type)

    return NextResponse.json({
      success: true,
      data: {
        url,
        key,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Upload failed',
        },
      },
      { status: 500 }
    )
  }
}
