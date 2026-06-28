# Audit Log Integration Guide

The audit log system has been successfully set up! Here's how to use it throughout your application.

## 🗃️ Database Setup

First, run the migration to create the audit_log table:

```bash
npx prisma migrate dev --name add_audit_log
# or
pnpm prisma migrate dev --name add_audit_log
```

Then generate Prisma client:

```bash
npx prisma generate
# or
pnpm prisma generate
```

## 📋 Features Implemented

1. **AuditLog Model** - Tracks all user actions with details
2. **API Endpoints** - GET /api/audit-logs and POST /api/audit-logs/create
3. **React Hook** - `useAuditLog()` for easy logging in components
4. **UI Page** - /audit-log with filters, search, and export
5. **Utility Functions** - Backend logging utilities

## 🎯 How to Use

### In React Components

```tsx
function MyComponent() {
  const { log } = useAuditLog();

  const handleCreate = async () => {
    // Your create logic
    const newItem = await createItem();
    
    // Log the action
    await log({
      action: "CREATE",
      resource: "Sasaran",
      resourceId: newItem.id,
      details: { name: newItem.name }
    });
  };

  const handleUpdate = async (id: number) => {
    // Your update logic
    const updated = await updateItem(id, data);
    
    // Log the action
    await log({
      action: "UPDATE",
      resource: "Sasaran",
      resourceId: id,
      details: { changes: data }
    });
  };

  const handleDelete = async (id: number) => {
    // Your delete logic
    await deleteItem(id);
    
    // Log the action
    await log({
      action: "DELETE",
      resource: "Sasaran",
      resourceId: id
    });
  };
}
```

### In API Routes (Server-Side)

```tsx
export async function POST(request: NextRequest) {
  // Your logic
  const result = await doSomething();
  
  // Log the action
  await logAudit({
    userId: user.email,
    userName: user.name,
    action: "CREATE",
    resource: "RisikoActual",
    resourceId: result.id.toString(),
    details: { ...result },
    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown"
  });
}
```

## 🔧 Integration Examples

### 1. Update Auth Provider to Log Login/Logout

Update `src/providers/auth-provider/auth-provider.client.ts`:

```tsx
// Add to login method
login: async ({ email, password }) => {
  const user = mockUsers.find(
    (item) => item.email === email && item.password === password
  );

  if (user) {
    Cookies.set(TOKEN_KEY, JSON.stringify(user), {
      expires: 30,
      path: "/",
    });
    
    // Log login action
    await fetch("/api/audit-logs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.email,
        userName: user.name,
        action: "LOGIN",
        resource: "Auth",
        details: { method: "email" }
      })
    });

    return {
      success: true,
      redirectTo: "/",
    };
  }
  // ... rest of code
},

// Add to logout method
logout: async () => {
  const user = Cookies.get(TOKEN_KEY);
  if (user) {
    const parsedUser = JSON.parse(user);
    
    // Log logout action
    await fetch("/api/audit-logs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: parsedUser.email,
        userName: parsedUser.name,
        action: "LOGOUT",
        resource: "Auth"
      })
    });
  }
  
  Cookies.remove(TOKEN_KEY);
  return {
    success: true,
    redirectTo: "/login",
  };
},
```

### 2. Log in Pelaporan Risiko Page

Add to `src/app/(app)/pelaporan-risiko/page.tsx`:

```tsx
export default function PelaporanRisikoPage() {
  const { log } = useAuditLog();

  // Log when creating new pelaporan
  const handleSaveModal = async () => {
    if (!selectedSasaran) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/pelaporan-risiko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sasaranId: selectedSasaran.id,
          tanggalPelaporan: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Log the creation
        await log({
          action: "CREATE",
          resource: "PelaporanRisiko",
          resourceId: result.id,
          details: {
            sasaranId: selectedSasaran.id,
            sasaranName: selectedSasaran.sasaran
          }
        });

        setModalOpened(false);
        refetch();
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Log when viewing details
  const handleViewDetail = async (id: number) => {
    router.push(`/pelaporan-risiko/${id}`);
    
    await log({
      action: "VIEW",
      resource: "PelaporanRisiko",
      resourceId: id
    });
  };

  // Log downloads
  const handleDownloadExcel = async () => {
    await log({
      action: "DOWNLOAD",
      resource: "PelaporanRisiko",
      details: { format: "excel" }
    });
    
    // Your download logic
  };
}
```

### 3. Log in CRUD Operations

For any create/update/delete operations:

```tsx
// CREATE
const { log } = useAuditLog();

const handleCreate = async (data) => {
  const result = await createMutation(data);
  
  await log({
    action: "CREATE",
    resource: "ResourceName",
    resourceId: result.id,
    details: data
  });
};

// UPDATE
const handleUpdate = async (id, data) => {
  await updateMutation(id, data);
  
  await log({
    action: "UPDATE",
    resource: "ResourceName",
    resourceId: id,
    details: { changes: data }
  });
};

// DELETE
const handleDelete = async (id) => {
  await deleteMutation(id);
  
  await log({
    action: "DELETE",
    resource: "ResourceName",
    resourceId: id
  });
};
```

## 📊 Available Actions

- `CREATE` - Creating new resources
- `UPDATE` - Updating existing resources
- `DELETE` - Deleting resources
- `VIEW` - Viewing resource details
- `LOGIN` - User login
- `LOGOUT` - User logout
- `DOWNLOAD` - Downloading files/exports
- `UPLOAD` - Uploading files
- `APPROVE` - Approving actions
- `REJECT` - Rejecting actions

## 🎨 UI Features

The audit log page (/audit-log) includes:

- ✅ Real-time filtering by user, action, resource, and date range
- ✅ Search functionality
- ✅ Pagination
- ✅ Export to CSV
- ✅ Color-coded action badges
- ✅ Detailed view of each action
- ✅ IP address and user agent tracking

## 🔒 Security Notes

1. Audit logs are append-only (no delete endpoint)
2. Logged user information comes from authenticated session
3. IP addresses and user agents are captured automatically
4. Failed audit logs don't break the main application flow

## 📝 Next Steps

1. Run the database migration
2. Add the "Audit Log" menu item to your navigation
3. Integrate logging into existing pages (see examples above)
4. Test the audit log page at /audit-log

## 🔗 Menu Integration

Add to your navigation menu (usually in layout or sidebar):

```tsx
{
  name: "Audit Log",
  icon: <IconFileAnalytics />,
  route: "/audit-log"
}
```
