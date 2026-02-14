import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getSignedDownloadUrl } from '@/lib/storage/r2'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Construct the file key from path segments
    const fileKey = params.path.join('/')
    console.log('📁 Fetching file from R2:', fileKey)

    // Get signed URL from R2
    const signedUrl = await getSignedDownloadUrl(fileKey)
    console.log('✅ Generated signed URL:', signedUrl.substring(0, 100) + '...')

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error('❌ Error getting file:', error)
    return NextResponse.json(
      { error: 'Failed to get file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
