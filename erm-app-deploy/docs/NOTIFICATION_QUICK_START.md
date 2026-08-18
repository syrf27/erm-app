# Email Notification System - Quick Start

Sistem notifikasi email otomatis untuk mengingatkan risiko yang akan jatuh tempo (H-7, H-5, H-1).

## Files Created

1. **API Endpoint**: `src/app/api/notifications/risk-reminder/route.ts`
   - Secure REST API dengan Bearer token authentication
   - Query risiko berdasarkan target waktu
   - Kirim email ke penanggung jawab

2. **Email Library**: `src/lib/email.ts`
   - Nodemailer configuration
   - Send email function
   - Test email utility

3. **Cron Script**: `scripts/send-risk-notifications.sh`
   - Shell script untuk trigger API
   - Support H-7, H-5, H-1 notifications
   - Auto logging

4. **Configuration**:
   - `.env.example` - Template environment variables
   - `scripts/crontab.example` - Contoh crontab configuration
   - `docs/EMAIL_NOTIFICATION_SETUP.md` - Dokumentasi lengkap

## Quick Setup Checklist

- [ ] Install dependencies: `npm install nodemailer && npm install -D @types/nodemailer`
- [ ] Copy `.env.example` to `.env`
- [ ] Setup Gmail App Password (https://myaccount.google.com/apppasswords)
- [ ] Update `.env` dengan SMTP credentials
- [ ] Generate secret key: `openssl rand -base64 32`
- [ ] Update `CRON_API_SECRET_KEY` di `.env`
- [ ] Buat folder logs: `mkdir -p ~/dev/erm-app/logs`
- [ ] Test script manual: `./scripts/send-risk-notifications.sh 7`
- [ ] Setup crontab: `crontab -e` (lihat `scripts/crontab.example`)
- [ ] Test API endpoint dengan curl
- [ ] Monitor logs: `tail -f logs/cron-h7.log`

## Testing

Test API endpoint:

```bash
curl -X POST http://localhost:3000/api/notifications/risk-reminder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{"daysBeforeDeadline": 7}'
```

## Cron Schedule

- **H-7**: Setiap hari jam 08:00
- **H-5**: Setiap hari jam 08:00  
- **H-1**: Setiap hari jam 08:00 dan 14:00 (2x sehari)

## Documentation

Lihat dokumentasi lengkap: `docs/EMAIL_NOTIFICATION_SETUP.md`

---

Created: 1/7/2026
