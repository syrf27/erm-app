# CHANGELOG - Email Notification System

## [1.0.1] - 1/7/2026

### Fixed
- **Build Error**: Fixed PrismaClient import issue
  - Changed from: `const prisma = new PrismaClient()` (causing build error)
  - Changed to: `` (uses existing singleton)
  - Reason: Project already has Prisma singleton pattern in `src/lib/prisma.ts`
  - Files affected:
    * `src/app/api/notifications/risk-reminder/route.ts`
    * `src/app/api/notifications/status/route.ts`

### Technical Details
The project uses a Prisma singleton pattern with PG adapter:
- Singleton prevents multiple Prisma instances in development
- Uses `@prisma/adapter-pg` with connection pooling
- Global instance cached in `globalForPrisma.prisma`
- Custom Prisma client generated in `src/generated/prisma`

---

## [1.0.0] - 1/7/2026

### Added
- ✅ API endpoint untuk notifikasi risiko (`/api/notifications/risk-reminder`)
- ✅ Email service dengan Nodemailer
- ✅ Cron job shell script untuk H-7, H-5, H-1
- ✅ Monitoring endpoint (`/api/notifications/status`)
- ✅ Bearer token authentication untuk keamanan API
- ✅ Responsive HTML email templates
- ✅ Comprehensive documentation
- ✅ Test files dan examples

### Security
- Bearer token authentication di API endpoints
- Environment-based secret key management
- Gmail App Password support (2FA required)
- Input validation untuk API requests

### Documentation
- Full setup guide: `docs/EMAIL_NOTIFICATION_SETUP.md`
- Quick start: `docs/NOTIFICATION_QUICK_START.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- NPM scripts helper: `docs/NPM_SCRIPTS.md`
