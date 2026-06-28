#!/bin/bash

echo "=================================="
echo "🚀 AUDIT LOG SETUP SCRIPT"
echo "=================================="
echo ""

cd ~/dev/erm-app

echo "Step 1: Installing dependencies..."
echo "-----------------------------------"
npm install exceljs @mantine/dates dayjs

echo ""
echo "Step 2: Running Prisma migration..."
echo "-----------------------------------"
npx prisma migrate dev --name add_audit_log

echo ""
echo "Step 3: Generating Prisma client..."
echo "-----------------------------------"
npx prisma generate

echo ""
echo "=================================="
echo "✅ SETUP COMPLETE!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. npm run dev (to start the development server)"
echo "  2. Navigate to http://localhost:3000/audit-log"
echo "  3. Check the menu - 'Audit Log' should now appear"
echo ""
echo "Files created:"
echo "  ✓ Database model: AuditLog"
echo "  ✓ API endpoints: /api/audit-logs"
echo "  ✓ UI page: /audit-log"
echo "  ✓ React hook: useAuditLog()"
echo "  ✓ Menu item: Added to navigation"
echo ""
echo "Documentation:"
echo "  - Quick Start: AUDIT_LOG_QUICKSTART.md"
echo "  - Full Guide: AUDIT_LOG_GUIDE.md"
echo "  - Summary: AUDIT_LOG_SUMMARY.txt"
echo ""
