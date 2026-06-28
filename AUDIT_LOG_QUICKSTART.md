# 🔍 Audit Log System - Quick Start

## Setup (3 steps)

### 1. Database Migration
```bash
cd ~/dev/erm-app
npx prisma migrate dev --name add_audit_log
npx prisma generate
```

### 2. Install Dependencies (if needed)
```bash
npm install @mantine/dates dayjs
```

### 3. Add to Navigation
Edit your sidebar/navigation component and add:
```tsx
{
  label: "Audit Log",
  icon: <IconFileAnalytics />,
  href: "/audit-log"
}
```

## Usage

### In React Components
```tsx
function MyPage() {
  const { log } = useAuditLog();

  const handleAction = async () => {
    // Do something
    const result = await createItem();
    
    // Log it
    await log({
      action: "CREATE",
      resource: "Sasaran",
      resourceId: result.id,
      details: { name: result.name }
    });
  };
}
```

### In API Routes
```tsx
export async function POST(request: NextRequest) {
  const result = await doSomething();
  
  await logAudit({
    userId: "user@example.com",
    userName: "John Doe",
    action: "CREATE",
    resource: "ResourceName",
    resourceId: result.id.toString(),
    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown"
  });
}
```

## Available Actions
- CREATE, UPDATE, DELETE, VIEW
- LOGIN, LOGOUT
- DOWNLOAD, UPLOAD
- APPROVE, REJECT

## Access the UI
Navigate to: **http://localhost:3000/audit-log**

## Files Created
- ✅ `prisma/schema.prisma` - Database model
- ✅ `src/lib/audit-log.ts` - Backend utilities
- ✅ `src/hooks/useAuditLog.ts` - React hook
- ✅ `src/app/api/audit-logs/route.ts` - GET endpoint
- ✅ `src/app/api/audit-logs/create/route.ts` - POST endpoint
- ✅ `src/app/(app)/audit-log/page.tsx` - UI page
- ✅ `AUDIT_LOG_GUIDE.md` - Full documentation

For detailed examples, see **AUDIT_LOG_GUIDE.md**
