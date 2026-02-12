import Anthropic from '@anthropic-ai/sdk'
import {
  OCRResult,
  POSOCRData,
  HandwrittenOCRData,
  EDCOCRData,
  DepositSlipOCRData,
} from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

export async function processOCR(
  imageBase64: string,
  documentType: 'POS_REPORT' | 'HANDWRITTEN_SUMMARY' | 'EDC_SLIP' | 'PAY_IN_SLIP'
): Promise<OCRResult> {
  const startTime = Date.now()

  try {
    const prompt = getPromptForDocumentType(documentType)

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    const extractedData = parseOCRResponse(textContent.text, documentType)
    const processingTime = (Date.now() - startTime) / 1000

    return {
      success: true,
      documentType,
      extractedData,
      processingTime,
    }
  } catch (error) {
    console.error('OCR processing error:', error)
    return {
      success: false,
      documentType,
      extractedData: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function getPromptForDocumentType(
  type: 'POS_REPORT' | 'HANDWRITTEN_SUMMARY' | 'EDC_SLIP' | 'PAY_IN_SLIP'
): string {
  switch (type) {
    case 'POS_REPORT':
      return `
You are analyzing a POS (Point of Sale) report image. Extract the following information in JSON format:

{
  "totalSales": number,
  "cash": number,
  "credit": number,
  "transfer": number,
  "expenses": number,
  "startTime": "HH:MM" (optional),
  "endTime": "HH:MM" (optional),
  "billCount": number (optional),
  "avgPerBill": number (optional)
}

Rules:
- Extract all monetary amounts as numbers (without currency symbols or commas)
- If a field is not visible, omit it or set to 0
- Return ONLY valid JSON, no additional text
`

    case 'HANDWRITTEN_SUMMARY':
      return `
You are analyzing a handwritten summary slip. Extract the following information in JSON format:

{
  "cashCount": number,
  "expenses": number,
  "expensesList": [
    {"category": "string", "amount": number}
  ],
  "netCash": number
}

Rules:
- Extract all monetary amounts as numbers
- Parse handwritten expense items into categories
- Calculate netCash = cashCount - expenses
- Return ONLY valid JSON
`

    case 'EDC_SLIP':
      return `
You are analyzing an EDC (Electronic Data Capture) settlement slip. Extract the following in JSON format:

{
  "totalAmount": number,
  "settlementDate": "DD/MM/YYYY" (optional),
  "batchNumber": "string" (optional),
  "breakdown": [
    {"type": "VISA|MASTERCARD|etc", "amount": number}
  ]
}

Rules:
- Extract total settlement amount
- Parse card type breakdowns (VISA, MASTERCARD, etc.)
- Return ONLY valid JSON
`

    case 'PAY_IN_SLIP':
      return `
You are analyzing a bank deposit pay-in slip. Extract the following in JSON format:

{
  "depositAmount": number,
  "depositDate": "DD/MM/YYYY",
  "depositTime": "HH:MM:SS" (optional),
  "bankName": "string" (optional),
  "bankBranch": "string" (optional),
  "accountNumber": "string" (optional)
}

Rules:
- Extract deposit amount, date, and time
- Extract bank information if visible
- Return ONLY valid JSON
`
  }
}

function parseOCRResponse(
  text: string,
  documentType: 'POS_REPORT' | 'HANDWRITTEN_SUMMARY' | 'EDC_SLIP' | 'PAY_IN_SLIP'
): any {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate based on document type
    switch (documentType) {
      case 'POS_REPORT':
        return {
          totalSales: parsed.totalSales || 0,
          cash: parsed.cash || 0,
          credit: parsed.credit || 0,
          transfer: parsed.transfer || 0,
          expenses: parsed.expenses || 0,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          billCount: parsed.billCount,
          avgPerBill: parsed.avgPerBill,
        } as POSOCRData

      case 'HANDWRITTEN_SUMMARY':
        return {
          cashCount: parsed.cashCount || 0,
          expenses: parsed.expenses || 0,
          expensesList: parsed.expensesList || [],
          netCash: parsed.netCash || 0,
        } as HandwrittenOCRData

      case 'EDC_SLIP':
        return {
          totalAmount: parsed.totalAmount || 0,
          settlementDate: parsed.settlementDate,
          batchNumber: parsed.batchNumber,
          breakdown: parsed.breakdown || [],
        } as EDCOCRData

      case 'PAY_IN_SLIP':
        return {
          depositAmount: parsed.depositAmount || 0,
          depositDate: parsed.depositDate || '',
          depositTime: parsed.depositTime,
          bankName: parsed.bankName,
          bankBranch: parsed.bankBranch,
          accountNumber: parsed.accountNumber,
        } as DepositSlipOCRData
    }
  } catch (error) {
    console.error('Failed to parse OCR response:', error)
    throw error
  }
}

export async function batchProcessOCR(
  images: Array<{ base64: string; type: 'POS_REPORT' | 'HANDWRITTEN_SUMMARY' | 'EDC_SLIP' }>
): Promise<{
  pos?: POSOCRData
  handwritten?: HandwrittenOCRData
  edc?: EDCOCRData
}> {
  const results = await Promise.all(
    images.map((img) => processOCR(img.base64, img.type))
  )

  const output: any = {}

  results.forEach((result, index) => {
    if (result.success) {
      const type = images[index].type
      if (type === 'POS_REPORT') output.pos = result.extractedData
      if (type === 'HANDWRITTEN_SUMMARY') output.handwritten = result.extractedData
      if (type === 'EDC_SLIP') output.edc = result.extractedData
    }
  })

  return output
}
