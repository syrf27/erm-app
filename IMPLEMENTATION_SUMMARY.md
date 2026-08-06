# IMPLEMENTATION SUMMARY - Email Notification System
# Sistem Notifikasi Email Otomatis untuk ERM App

Generated: 1/7/2026, 09.19.32

## FILES CREATED

### 1. API Endpoints

#### /src/app/api/notifications/risk-reminder/route.ts
- REST API endpoint untuk trigger notifikasi risiko
- Security: Bearer token authentication
- Features:
  * Query database untuk risiko yang akan jatuh tempo (H-7, H-5, H-1)
  * Group risiko berdasarkan user (penanggung jawab)
  * Send email notification dengan template HTML responsive
  * Return detailed results (success/failed emails)

#### /src/app/api/notifications/status/route.ts
- Monitoring endpoint untuk cek status sistem
- Features:
  * Count upcoming risks (H-7, H-5, H-1)
  * Read recent cron logs
  * System health check
  * SMTP configuration status

### 2. Libraries

#### /src/lib/email.ts
- Email service menggunakan Nodemailer
- Functions:
  * sendEmail() - Kirim email dengan HTML template
  * testEmailConfig() - Test SMTP configuration
- Support Gmail, SMTP custom

### 3. Scripts

#### /scripts/send-risk-notifications.sh
- Shell script untuk trigger API dari cron job
- Usage: ./send-risk-notifications.sh {7|5|1}
- Features:
  * Load environment variables dari .env
  * Send authenticated POST request ke API
  * Log results dengan timestamp
  * Handle HTTP response codes

### 4. Configuration Files

#### /.env.example
Template environment variables:
- Database URL
- SMTP configuration (Gmail atau custom)
- API secret key untuk cron authentication
- Application URL

#### /scripts/crontab.example
Contoh konfigurasi crontab:
- H-7: Daily at 08:00
- H-5: Daily at 08:00
- H-1: Twice daily at 08:00 and 14:00

### 5. Documentation

#### /docs/EMAIL_NOTIFICATION_SETUP.md
Dokumentasi lengkap mencakup:
- Arsitektur sistem
- Prerequisites
- Step-by-step installation
- Configuration guide
- Gmail App Password setup
- Cron job setup
- Testing procedures
- Troubleshooting
- Security best practices

#### /docs/NOTIFICATION_QUICK_START.md
Quick reference guide:
- Setup checklist
- Quick testing commands
- Common configurations

### 6. Tests

#### /src/app/api/notifications/risk-reminder/__tests__/route.test.ts
Unit tests untuk API endpoint:
- Authentication tests (401 unauthorized)
- Input validation tests (400 bad request)
- Success scenario tests (200 OK)

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────┐
│   Cron Job      │  (Server scheduler)
│   - H-7: 08:00  │
│   - H-5: 08:00  │
│   - H-1: 08:00, │
│         14:00   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Shell Script                   │
│  send-risk-notifications.sh     │
│  - Load .env                    │
│  - Call API with Bearer token   │
│  - Log results                  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API Route (Next.js)            │
│  /api/notifications/            │
│  risk-reminder                  │
│  - Verify API key               │
│  - Query database               │
│  - Send emails                  │
└────────┬────────────────────────┘
         │
         ├───────────────┬─────────────────┐
         ▼               ▼                 ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  Database   │  │ Email Lib    │  │ Response     │
│  (Prisma)   │  │ (Nodemailer) │  │ (JSON)       │
│             │  │              │  │              │
│ Query risks │  │ Send via     │  │ Results to   │
│ by target   │  │ SMTP (Gmail) │  │ cron script  │
│ date        │  │              │  │              │
└─────────────┘  └──────────────┘  └──────────────┘
```

---

## SECURITY FEATURES

1. **API Authentication**
   - Bearer token authentication
   - Secret key stored in .env
   - Reject unauthorized requests (401)

2. **Input Validation**
   - Validate daysBeforeDeadline (must be 7, 5, or 1)
   - Sanitize database queries
   - Type-safe with TypeScript

3. **Credentials Protection**
   - SMTP credentials in .env (not committed to Git)
   - Gmail App Password (not regular password)
   - API secret key rotation support

4. **Error Handling**
   - Try-catch blocks
   - Detailed error logging
   - Safe error messages to client

---

## EMAIL TEMPLATE FEATURES

✓ Responsive HTML design
✓ Professional styling with gradient header
✓ Risk table with color-coded urgency (H-1: red, H-5: yellow, H-7: blue)
✓ Action button linking to dashboard
✓ User-friendly date formatting (Indonesian locale)
✓ Tips section for best practices
✓ Branded footer with timestamp

---

## SETUP STEPS (Quick Reference)

1. Install dependencies:
   ```bash
   npm install nodemailer
   npm install -D @types/nodemailer
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your SMTP credentials
   ```

3. Generate secret key:
   ```bash
   openssl rand -base64 32
   # Add to .env as CRON_API_SECRET_KEY
   ```

4. Create logs directory:
   ```bash
   mkdir -p ~/dev/erm-app/logs
   ```

5. Test manually:
   ```bash
   ./scripts/send-risk-notifications.sh 7
   ```

6. Setup crontab:
   ```bash
   crontab -e
   # Copy from scripts/crontab.example
   ```

---

## TESTING COMMANDS

### Test API endpoint directly
```bash
curl -X POST http://localhost:3000/api/notifications/risk-reminder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{"daysBeforeDeadline": 7}'
```

### Test via shell script
```bash
./scripts/send-risk-notifications.sh 7
./scripts/send-risk-notifications.sh 5
./scripts/send-risk-notifications.sh 1
```

### Monitor logs
```bash
tail -f logs/cron-h7.log
tail -f logs/cron-h5.log
tail -f logs/cron-h1.log
```

### Check monitoring endpoint
```bash
curl http://localhost:3000/api/notifications/status \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

---

## GMAIL SETUP (Important!)

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Go to: https://myaccount.google.com/apppasswords
4. Create new App Password for "Mail"
5. Copy the 16-character password
6. Add to .env as SMTP_PASSWORD

DO NOT use your regular Gmail password!

---

## MONITORING

### Check cron status
```bash
crontab -l  # List current cron jobs
```

### View logs
```bash
# Recent H-7 notifications
tail -20 logs/cron-h7.log

# Follow live
tail -f logs/cron-h1.log
```

### API monitoring endpoint
```
GET /api/notifications/status
```

Returns:
- Upcoming risks count (H-7, H-5, H-1)
- Recent cron logs
- System configuration status

---

## TROUBLESHOOTING

### Email not sent?
- Check .env SMTP credentials
- Verify Gmail App Password (not regular password)
- Check SMTP_HOST and SMTP_PORT
- Test with: curl command above

### Cron not running?
- Check crontab: `crontab -l`
- Verify script is executable: `chmod +x scripts/send-risk-notifications.sh`
- Check system cron logs: `log show --predicate 'process == "cron"' --last 1h`

### API returns 401?
- Verify CRON_API_SECRET_KEY in .env
- Check Bearer token in Authorization header
- Restart Next.js app after changing .env

### No risks found?
- Check database has risks with realisasiWaktu = today + N days
- Verify date calculation in API code
- Check database connection

---

## NEXT STEPS

After implementation:

1. [ ] Test with real data
2. [ ] Monitor first few executions
3. [ ] Adjust cron schedule if needed
4. [ ] Setup production SMTP (if not using Gmail)
5. [ ] Add user email preferences (opt-out)
6. [ ] Create admin dashboard for monitoring
7. [ ] Setup alerts for failed notifications
8. [ ] Add notification history table

---

## SUPPORT

For issues or questions:
- Check documentation: docs/EMAIL_NOTIFICATION_SETUP.md
- Review logs in: logs/
- Test API manually with curl
- Contact development team

---

Created by: AI Assistant
Date: Rabu, 1 Juli 2026
