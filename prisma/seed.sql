-- ============================================
-- PSARS Database Seed SQL
-- ============================================
-- สามารถรันใน TablePlus หรือ psql ได้เลย
-- ============================================

-- Clear existing data (ระวังใน production!)
TRUNCATE TABLE "AuditLog" CASCADE;
TRUNCATE TABLE "Deposit" CASCADE;
TRUNCATE TABLE "DailyClosing" CASCADE;
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Branch" CASCADE;
TRUNCATE TABLE "SystemConfig" CASCADE;

-- ============================================
-- 1. BRANCHES (5 สาขา)
-- ============================================
INSERT INTO "Branch" (id, "branchCode", "branchName", address, "phoneNumber", status, "createdAt", "updatedAt") VALUES
('branch_rama9', 'BR001', 'MerMed Rama9', '123 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310', '02-123-4567', 'ACTIVE', NOW(), NOW()),
('branch_phuket', 'BR002', 'MerMed Phuket', '456 ถ.ป่าตอง ต.ป่าตอง อ.กะทู้ จ.ภูเก็ต 83150', '076-123-456', 'ACTIVE', NOW(), NOW()),
('branch_pattaya', 'BR003', 'MerMed Pattaya', '789 ถ.พัทยากลาง ต.หนองปรือ อ.บางละมุง จ.ชลบุรี 20150', '038-123-456', 'ACTIVE', NOW(), NOW()),
('branch_central', 'BR004', 'MerMed Central', '321 ถ.พระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330', '02-234-5678', 'ACTIVE', NOW(), NOW()),
('branch_chiangmai', 'BR005', 'MerMed Chiang Mai', '888 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200', '053-123-456', 'ACTIVE', NOW(), NOW());

-- ============================================
-- 2. USERS (8 users)
-- Password สำหรับทุกคน: bcrypt hash ของ 'Staff@2026', 'Auditor@2026', etc.
-- ============================================

-- Store Staff (5 คน - 1 คนต่อสาขา)
INSERT INTO "User" (id, email, username, "passwordHash", "firstName", "lastName", "phoneNumber", role, status, "branchId", "createdAt", "updatedAt") VALUES
('staff_rama9', 'staff.br001@mermed.com', 'staff.br001', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'สมชาย1', 'ใจดี', '081-000-0001', 'STORE_STAFF', 'ACTIVE', 'branch_rama9', NOW(), NOW()),
('staff_phuket', 'staff.br002@mermed.com', 'staff.br002', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'สมชาย2', 'ใจดี', '081-000-0002', 'STORE_STAFF', 'ACTIVE', 'branch_phuket', NOW(), NOW()),
('staff_pattaya', 'staff.br003@mermed.com', 'staff.br003', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'สมชาย3', 'ใจดี', '081-000-0003', 'STORE_STAFF', 'ACTIVE', 'branch_pattaya', NOW(), NOW()),
('staff_central', 'staff.br004@mermed.com', 'staff.br004', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'สมชาย4', 'ใจดี', '081-000-0004', 'STORE_STAFF', 'ACTIVE', 'branch_central', NOW(), NOW()),
('staff_chiangmai', 'staff.br005@mermed.com', 'staff.br005', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'สมชาย5', 'ใจดี', '081-000-0005', 'STORE_STAFF', 'ACTIVE', 'branch_chiangmai', NOW(), NOW());

-- Auditor
INSERT INTO "User" (id, email, username, "passwordHash", "firstName", "lastName", "phoneNumber", role, status, "branchId", "createdAt", "updatedAt") VALUES
('auditor_main', 'auditor@mermed.com', 'auditor.main', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'สมหญิง', 'ตรวจสอบ', '081-111-1111', 'AUDITOR', 'ACTIVE', NULL, NOW(), NOW());

-- Owner
INSERT INTO "User" (id, email, username, "passwordHash", "firstName", "lastName", "phoneNumber", role, status, "branchId", "createdAt", "updatedAt") VALUES
('owner_main', 'owner@mermed.com', 'owner', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'สมศักดิ์', 'เจ้าของ', '081-999-9999', 'OWNER', 'ACTIVE', NULL, NOW(), NOW());

-- Admin
INSERT INTO "User" (id, email, username, "passwordHash", "firstName", "lastName", "phoneNumber", role, status, "branchId", "createdAt", "updatedAt") VALUES
('admin_main', 'admin@mermed.com', 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5koYV.LnN5n0i', 'ผู้ดูแล', 'ระบบ', '081-888-8888', 'ADMIN', 'ACTIVE', NULL, NOW(), NOW());

-- ============================================
-- 3. SYSTEM CONFIG
-- ============================================
INSERT INTO "SystemConfig" (id, key, value, description, "dataType", "createdAt", "updatedAt") VALUES
('config_1', 'DISCREPANCY_THRESHOLD_PERCENT', '1.0', 'Percentage threshold for discrepancy alerts', 'number', NOW(), NOW()),
('config_2', 'DISCREPANCY_THRESHOLD_AMOUNT', '50', 'Amount threshold for discrepancy alerts (THB)', 'number', NOW(), NOW()),
('config_3', 'DEPOSIT_VARIANCE_THRESHOLD', '10', 'Acceptable variance for deposit amount (THB)', 'number', NOW(), NOW());

-- ============================================
-- 4. DAILY CLOSINGS
-- ============================================

-- SUBMITTED (3 รายการ - รอรับเงิน)
INSERT INTO "DailyClosing" (
  id, "closingDate", "branchId", "submittedBy", status, "submittedAt",
  "posTotalSales", "posCash", "posCredit", "posTransfer", "posExpenses",
  "posBillCount", "posAvgPerBill",
  "handwrittenCashCount", "handwrittenExpenses", "handwrittenNetCash",
  "edcTotalAmount",
  "hasDiscrepancy", "discrepancyRemark", "posCreditVsEdcDiff", "posTotalVsHandwrittenDiff",
  "createdAt", "updatedAt"
) VALUES
-- Rama9 - มี discrepancy
('closing_rama9_yesterday', CURRENT_DATE - INTERVAL '1 day', 'branch_rama9', 'staff_rama9', 'SUBMITTED', CURRENT_TIMESTAMP - INTERVAL '6 hours',
 45000.00, 15000.00, 20000.00, 10000.00, 2000.00,
 45, 1000.00,
 14950.00, 2000.00, 12950.00,
 20000.00,
 true, 'เงินสดขาด 50 บาท', 0, -50.00,
 NOW(), NOW()),

-- Phuket
('closing_phuket_yesterday', CURRENT_DATE - INTERVAL '1 day', 'branch_phuket', 'staff_phuket', 'SUBMITTED', CURRENT_TIMESTAMP - INTERVAL '5 hours',
 38500.00, 12000.00, 18500.00, 8000.00, 1500.00,
 32, 1203.13,
 12000.00, 1500.00, 10500.00,
 18500.00,
 false, NULL, 0, 0,
 NOW(), NOW()),

-- Pattaya - วันนี้
('closing_pattaya_today', CURRENT_DATE, 'branch_pattaya', 'staff_pattaya', 'SUBMITTED', CURRENT_TIMESTAMP,
 52000.00, 18000.00, 25000.00, 9000.00, 2500.00,
 51, 1019.61,
 18000.00, 2500.00, 15500.00,
 25000.00,
 false, NULL, 0, 0,
 NOW(), NOW());

-- CASH_RECEIVED (2 รายการ - รอนำฝาก)
INSERT INTO "DailyClosing" (
  id, "closingDate", "branchId", "submittedBy", status, "submittedAt", "cashReceivedAt", "cashReceivedBy",
  "posTotalSales", "posCash", "posCredit", "posTransfer", "posExpenses",
  "posBillCount", "posAvgPerBill",
  "handwrittenCashCount", "handwrittenExpenses", "handwrittenNetCash",
  "edcTotalAmount",
  "hasDiscrepancy", "posCreditVsEdcDiff", "posTotalVsHandwrittenDiff",
  "createdAt", "updatedAt"
) VALUES
-- Central
('closing_central_2days', CURRENT_DATE - INTERVAL '2 days', 'branch_central', 'staff_central', 'CASH_RECEIVED',
 CURRENT_TIMESTAMP - INTERVAL '2 days 6 hours', CURRENT_TIMESTAMP - INTERVAL '2 days 4 hours', 'auditor_main',
 41000.00, 13500.00, 19000.00, 8500.00, 1800.00,
 40, 1025.00,
 13500.00, 1800.00, 11700.00,
 19000.00,
 false, 0, 0,
 NOW(), NOW()),

-- Chiang Mai
('closing_chiangmai_2days', CURRENT_DATE - INTERVAL '2 days', 'branch_chiangmai', 'staff_chiangmai', 'CASH_RECEIVED',
 CURRENT_TIMESTAMP - INTERVAL '2 days 5 hours', CURRENT_TIMESTAMP - INTERVAL '2 days 3 hours', 'auditor_main',
 36000.00, 11000.00, 17000.00, 8000.00, 1600.00,
 35, 1028.57,
 11000.00, 1600.00, 9400.00,
 17000.00,
 false, 0, 0,
 NOW(), NOW());

-- DEPOSITED (2 รายการ - นำฝากแล้ว)
INSERT INTO "DailyClosing" (
  id, "closingDate", "branchId", "submittedBy", status, "submittedAt", "cashReceivedAt", "cashReceivedBy", "completedAt",
  "posTotalSales", "posCash", "posCredit", "posTransfer", "posExpenses",
  "posBillCount", "posAvgPerBill",
  "handwrittenCashCount", "handwrittenExpenses", "handwrittenNetCash",
  "edcTotalAmount",
  "hasDiscrepancy", "posCreditVsEdcDiff", "posTotalVsHandwrittenDiff",
  "createdAt", "updatedAt"
) VALUES
-- Rama9 - 3 days ago
('closing_rama9_3days', CURRENT_DATE - INTERVAL '3 days', 'branch_rama9', 'staff_rama9', 'DEPOSITED',
 CURRENT_TIMESTAMP - INTERVAL '3 days 6 hours', CURRENT_TIMESTAMP - INTERVAL '3 days 4 hours', 'auditor_main', CURRENT_TIMESTAMP - INTERVAL '3 days 2 hours',
 48000.00, 16000.00, 22000.00, 10000.00, 2200.00,
 48, 1000.00,
 16000.00, 2200.00, 13800.00,
 22000.00,
 false, 0, 0,
 NOW(), NOW()),

-- Phuket - 3 days ago
('closing_phuket_3days', CURRENT_DATE - INTERVAL '3 days', 'branch_phuket', 'staff_phuket', 'DEPOSITED',
 CURRENT_TIMESTAMP - INTERVAL '3 days 5 hours', CURRENT_TIMESTAMP - INTERVAL '3 days 3 hours', 'auditor_main', CURRENT_TIMESTAMP - INTERVAL '3 days 1 hour',
 39500.00, 12500.00, 19000.00, 8000.00, 1700.00,
 38, 1039.47,
 12500.00, 1700.00, 10800.00,
 19000.00,
 false, 0, 0,
 NOW(), NOW());

-- ============================================
-- 5. DEPOSITS (2 รายการ)
-- ============================================
INSERT INTO "Deposit" (
  id, "dailyClosingId", "depositSlipUrl", "depositAmount", "depositDate",
  "bankName", "accountNumber", "amountMatched",
  "depositedBy", "depositedAt", "createdAt", "updatedAt"
) VALUES
('deposit_1', 'closing_rama9_3days', 'https://example.com/slip1.jpg', 13800.00, CURRENT_DATE - INTERVAL '3 days',
 'ธนาคารกสิกรไทย', '123-4-56789-0', true,
 'auditor_main', CURRENT_TIMESTAMP - INTERVAL '3 days 2 hours', NOW(), NOW()),

('deposit_2', 'closing_phuket_3days', 'https://example.com/slip2.jpg', 10800.00, CURRENT_DATE - INTERVAL '3 days',
 'ธนาคารกรุงเทพ', '987-6-54321-0', true,
 'auditor_main', CURRENT_TIMESTAMP - INTERVAL '3 days 1 hour', NOW(), NOW());

-- ============================================
-- 6. AUDIT LOGS (2 รายการตัวอย่าง)
-- ============================================
INSERT INTO "AuditLog" (
  id, "userId", action, "entityType", "entityId",
  "fieldName", "oldValue", "newValue", remark,
  "createdAt"
) VALUES
('audit_1', 'auditor_main', 'STATUS_CHANGE', 'DailyClosing', 'closing_rama9_3days',
 'status', 'SUBMITTED', 'CASH_RECEIVED', 'รับเงินจากสาขา MerMed Rama9 จำนวน 13800 บาท',
 CURRENT_TIMESTAMP - INTERVAL '3 days 4 hours'),

('audit_2', 'auditor_main', 'STATUS_CHANGE', 'DailyClosing', 'closing_rama9_3days',
 'status', 'CASH_RECEIVED', 'DEPOSITED', 'นำฝากเงินจากสาขา MerMed Rama9 จำนวน 13800 บาท เข้าบัญชี ธนาคารกสิกรไทย 123-4-56789-0',
 CURRENT_TIMESTAMP - INTERVAL '3 days 2 hours');

-- ============================================
-- สรุปข้อมูลที่ seed
-- ============================================
-- Branches: 5
-- Users: 8 (5 staff, 1 auditor, 1 owner, 1 admin)
-- Daily Closings: 7
--   - SUBMITTED: 3 (รอรับเงิน)
--   - CASH_RECEIVED: 2 (รอนำฝาก)
--   - DEPOSITED: 2 (นำฝากแล้ว)
-- Deposits: 2
-- Audit Logs: 2
--
-- Login Credentials:
--   Staff (Rama9): staff.br001@mermed.com / Staff@2026
--   Auditor: auditor@mermed.com / Auditor@2026
--   Owner: owner@mermed.com / Owner@2026
--   Admin: admin@mermed.com / Admin@2026
-- ============================================
