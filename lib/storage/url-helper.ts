/**
 * Convert R2 public URL to API proxy URL for authenticated access
 * Example: https://pub-xxx.r2.dev/deposit-slip/auditor/2026-02-14/123.jpg
 * Becomes: /api/files/deposit-slip/auditor/2026-02-14/123.jpg
 *
 * Also handles old format with bucket name:
 * https://account.r2.cloudflarestorage.com/bucket/closings/...
 * Becomes: /api/files/closings/...
 */
export function getProxiedImageUrl(r2Url: string): string {
  if (!r2Url) return ''

  try {
    const url = new URL(r2Url)
    let path = url.pathname.substring(1) // Remove leading slash

    // Remove bucket name if it's in the path (old format)
    // e.g., /rasasawas/closings/... -> closings/...
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    if (bucketName && path.startsWith(`${bucketName}/`)) {
      path = path.substring(bucketName.length + 1)
    }

    return `/api/files/${path}`
  } catch (error) {
    console.error('Invalid R2 URL:', r2Url)
    return r2Url // Return original if parsing fails
  }
}

/**
 * Extract file key from R2 URL
 * Example: https://pub-xxx.r2.dev/deposit-slip/auditor/2026-02-14/123.jpg
 * Returns: deposit-slip/auditor/2026-02-14/123.jpg
 */
export function extractFileKey(r2Url: string): string {
  if (!r2Url) return ''

  try {
    const url = new URL(r2Url)
    return url.pathname.substring(1) // Remove leading slash
  } catch (error) {
    console.error('Invalid R2 URL:', r2Url)
    return ''
  }
}
