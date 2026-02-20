import { formatCurrency, formatDate } from '@/lib/utils'

interface DailySummaryData {
  date: Date
  branches: {
    branchName: string
    branchCode: string
    totalSales: number
    cashCollected: number
    status: 'submitted' | 'collected' | 'deposited' | 'pending'
  }[]
  summary: {
    totalSales: number
    totalCashCollected: number
    totalDeposited: number
    pendingCollection: number
    pendingDeposit: number
  }
  deposits: {
    branchName: string
    amount: number
    status: string
    bankName: string | null
  }[]
  issues: {
    branchName: string
    issue: string
    severity: 'low' | 'medium' | 'high'
  }[]
}

export function generateDailySummaryEmail(data: DailySummaryData): string {
  const { date, branches, summary, deposits, issues } = data

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>สรุปยอดขายประจำวัน</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #1e40af;
      margin: 0;
      font-size: 24px;
    }
    .date {
      color: #6b7280;
      font-size: 14px;
      margin-top: 5px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-card {
      background-color: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 15px;
      border-radius: 4px;
    }
    .summary-card.warning {
      border-left-color: #f59e0b;
    }
    .summary-card.danger {
      border-left-color: #ef4444;
    }
    .summary-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
    }
    .summary-value {
      font-size: 28px;
      font-weight: bold;
      color: #111827;
      margin-top: 5px;
    }
    .summary-subtitle {
      font-size: 14px;
      color: #6b7280;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background-color: #f9fafb;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-submitted {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .status-collected {
      background-color: #ddd6fe;
      color: #6b21a8;
    }
    .status-deposited {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }
    .issue-section {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .issue-item {
      padding: 10px;
      margin-bottom: 10px;
      border-left: 3px solid #ef4444;
      background-color: white;
    }
    .issue-high {
      border-left-color: #dc2626;
    }
    .issue-medium {
      border-left-color: #f59e0b;
    }
    .issue-low {
      border-left-color: #fbbf24;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 สรุปยอดขายประจำวัน</h1>
      <div class="date">วันที่ ${formatDate(date)}</div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">ยอดขายรวม</div>
        <div class="summary-value">${formatCurrency(summary.totalSales)}</div>
        <div class="summary-subtitle">บาท</div>
      </div>

      <div class="summary-card">
        <div class="summary-label">เงินสดที่เก็บได้</div>
        <div class="summary-value">${formatCurrency(summary.totalCashCollected)}</div>
        <div class="summary-subtitle">บาท</div>
      </div>

      <div class="summary-card ${summary.pendingCollection > 0 ? 'warning' : ''}">
        <div class="summary-label">รอรับเงิน</div>
        <div class="summary-value">${summary.pendingCollection}</div>
        <div class="summary-subtitle">รายการ</div>
      </div>

      <div class="summary-card ${summary.pendingDeposit > 0 ? 'warning' : ''}">
        <div class="summary-label">รอนำฝาก</div>
        <div class="summary-value">${summary.pendingDeposit}</div>
        <div class="summary-subtitle">รายการ</div>
      </div>
    </div>

    <!-- Issues (if any) -->
    ${issues.length > 0 ? `
    <div class="issue-section">
      <h2 class="section-title" style="color: #dc2626;">⚠️ ประเด็นที่ต้องติดตาม</h2>
      ${issues.map(issue => `
        <div class="issue-item issue-${issue.severity}">
          <strong>${issue.branchName}:</strong> ${issue.issue}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Branch Summary Table -->
    <h2 class="section-title">สรุปยอดแต่ละสาขา</h2>
    <table>
      <thead>
        <tr>
          <th>สาขา</th>
          <th style="text-align: right;">ยอดขาย</th>
          <th style="text-align: right;">เงินสด</th>
          <th style="text-align: center;">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        ${branches.map(branch => `
          <tr>
            <td>
              <strong>${branch.branchName}</strong><br>
              <span style="font-size: 12px; color: #6b7280;">${branch.branchCode}</span>
            </td>
            <td style="text-align: right; font-weight: 600;">
              ${formatCurrency(branch.totalSales)}
            </td>
            <td style="text-align: right; font-weight: 600;">
              ${formatCurrency(branch.cashCollected)}
            </td>
            <td style="text-align: center;">
              <span class="status-badge status-${branch.status}">
                ${branch.status === 'submitted' ? 'ส่งยอดแล้ว' :
                  branch.status === 'collected' ? 'รับเงินแล้ว' :
                  branch.status === 'deposited' ? 'นำฝากแล้ว' : 'รอดำเนินการ'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Deposits Table -->
    ${deposits.length > 0 ? `
    <h2 class="section-title">รายการนำฝากวันนี้</h2>
    <table>
      <thead>
        <tr>
          <th>สาขา</th>
          <th style="text-align: right;">จำนวนเงิน</th>
          <th>ธนาคาร</th>
          <th style="text-align: center;">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        ${deposits.map(deposit => `
          <tr>
            <td><strong>${deposit.branchName}</strong></td>
            <td style="text-align: right; font-weight: 600;">
              ${formatCurrency(deposit.amount)}
            </td>
            <td>${deposit.bankName || '-'}</td>
            <td style="text-align: center;">
              <span class="status-badge status-${deposit.status.toLowerCase()}">
                ${deposit.status}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <div class="footer">
      <p>
        <strong>Mermaid Clinic Daily Closing System</strong><br>
        อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ<br>
        หากมีข้อสงสัยกรุณาติดต่อแผนก IT
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function generatePlainTextSummary(data: DailySummaryData): string {
  const { date, branches, summary, deposits, issues } = data

  let text = `
สรุปยอดขายประจำวัน
วันที่ ${formatDate(date)}

========================================
สรุปภาพรวม
========================================
ยอดขายรวม: ${formatCurrency(summary.totalSales)} บาท
เงินสดที่เก็บได้: ${formatCurrency(summary.totalCashCollected)} บาท
รอรับเงิน: ${summary.pendingCollection} รายการ
รอนำฝาก: ${summary.pendingDeposit} รายการ

`

  if (issues.length > 0) {
    text += `
========================================
ประเด็นที่ต้องติดตาม
========================================
${issues.map(issue => `- ${issue.branchName}: ${issue.issue}`).join('\n')}

`
  }

  text += `
========================================
สรุปยอดแต่ละสาขา
========================================
${branches.map(branch =>
  `${branch.branchName} (${branch.branchCode})
  ยอดขาย: ${formatCurrency(branch.totalSales)}
  เงินสด: ${formatCurrency(branch.cashCollected)}
  สถานะ: ${branch.status}
`).join('\n')}
`

  if (deposits.length > 0) {
    text += `
========================================
รายการนำฝากวันนี้
========================================
${deposits.map(deposit =>
  `${deposit.branchName}: ${formatCurrency(deposit.amount)} (${deposit.bankName || 'ไม่ระบุธนาคาร'}) - ${deposit.status}`
).join('\n')}
`
  }

  text += `
========================================
Mermaid Clinic Daily Closing System
อีเมลนี้ถูกส่งอัตโนมัติ
========================================
  `

  return text.trim()
}
