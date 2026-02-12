import { NextRequest, NextResponse } from 'next/server'
import { processOCR } from '@/lib/ocr/claude'
import { getCurrentUser } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { imageBase64, documentType } = await request.json()

    if (!imageBase64 || !documentType) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Missing imageBase64 or documentType' },
        },
        { status: 400 }
      )
    }

    const result = await processOCR(imageBase64, documentType)

    return NextResponse.json({
      success: result.success,
      data: result,
    })
  } catch (error) {
    console.error('OCR API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OCR_FAILED',
          message: error instanceof Error ? error.message : 'OCR processing failed',
        },
      },
      { status: 500 }
    )
  }
}
