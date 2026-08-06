# Setup Notifikasi Email Otomatis - ERM App

Dokumentasi lengkap untuk mengkonfigurasi sistem notifikasi email otomatis untuk pengingat rencana penanganan risiko (H-7, H-5, H-1).

## Daftar Isi

1. [Arsitektur Sistem](#arsitektur-sistem)
2. [Prerequisites](#prerequisites)
3. [Instalasi Dependencies](#instalasi-dependencies)
4. [Konfigurasi Environment](#konfigurasi-environment)
5. [Setup Cron Job](#setup-cron-job)
6. [Testing](#testing)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
8. [Keamanan](#keamanan)

---

## Arsitektur Sistem

### Komponen:

1. **Cron Job**: Scheduler yang berjalan di server untuk trigger notifikasi
2. **API Route**: /api/notifications/risk-reminder - endpoint aman dengan Bearer token
3. **Email Service**: Library Nodemailer untuk mengirim email via SMTP
4. **Database**: Query risiko yang akan jatuh tempo
5. **SMTP Server**: Gmail atau SMTP server lain untuk pengiriman email

---

## Prerequisites

- Node.js v18+ 
- PostgreSQL database (sudah running)
- Gmail account atau SMTP server lain
- Access ke server untuk setup cron job

---

## Instalasi Dependencies

Jalankan command berikut di root project:

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

---

## Konfigurasi Environment

### 1. Setup Gmail App Password

Jika menggunakan Gmail:

1. Buka https://myaccount.google.com/security
2. Aktifkan **2-Step Verification**
3. Buka https://myaccount.google.com/apppasswords
4. Buat App Password baru untuk "Mail"
5. Copy password yang di-generate (16 karakter)

### 2. Configure Environment Variables

Copy file .env.example ke .env:

```bash
cp .env.example .env
```

Edit .env dan isi konfigurasi berikut:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-16-char-app-password"
SMTP_FROM="your-email@gmail.com"
SMTP_FROM_NAME="ERM Risk Management System"

CRON_API_SECRET_KEY="your-secret-key-here"

NEXT_PUBLIC_APP_URL="http://your-domain.com"
```

### 3. Generate Secret Key

Generate random secret key untuk API authentication:

```bash
openssl rand -base64 32
```

Copy output ke CRON_API_SECRET_KEY di file .env.

---

## Setup Cron Job

### 1. Buat Direktori Logs

```bash
mkdir -p ~/dev/erm-app/logs
```

### 2. Test Script Manual

Test script sebelum setup cron:

```bash
# Test H-7 notification
~/dev/erm-app/scripts/send-risk-notifications.sh 7

# Test H-5 notification
~/dev/erm-app/scripts/send-risk-notifications.sh 5

# Test H-1 notification
~/dev/erm-app/scripts/send-risk-notifications.sh 1
```

### 3. Edit Crontab

Buka crontab editor:

```bash
crontab -e
```

Tambahkan konfigurasi berikut:

```cron
# ERM Risk Notifications

# H-7 Notification - Setiap hari jam 08:00
0 8 * * * /Users/alfiansyrff/dev/erm-app/scripts/send-risk-notifications.sh 7 >> /Users/alfiansyrff/dev/erm-app/logs/cron-h7.log 2>&1

# H-5 Notification - Setiap hari jam 08:00
0 8 * * * /Users/alfiansyrff/dev/erm-app/scripts/send-risk-notifications.sh 5 >> /Users/alfiansyrff/dev/erm-app/logs/cron-h5.log 2>&1

# H-1 Notification - Setiap hari jam 08:00 dan 14:00
0 8,14 * * * /Users/alfiansyrff/dev/erm-app/scripts/send-risk-notifications.sh 1 >> /Users/alfiansyrff/dev/erm-app/logs/cron-h1.log 2>&1
```

### 4. Verifikasi Crontab

Lihat crontab yang sudah di-set:

```bash
crontab -l
```

---

## Testing

### 1. Test Email Configuration

```bash
curl -X POST http://localhost:3000/api/notifications/risk-reminder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{"daysBeforeDeadline": 7}'
```

### 2. Monitor Logs

Lihat logs cron job:

```bash
# H-7 logs
tail -f ~/dev/erm-app/logs/cron-h7.log

# H-5 logs
tail -f ~/dev/erm-app/logs/cron-h5.log

# H-1 logs
tail -f ~/dev/erm-app/logs/cron-h1.log
```

---

## Monitoring & Troubleshooting

### Common Issues

#### 1. Email Tidak Terkirim

**Solution**:
- Pastikan App Password benar (bukan password Gmail biasa)
- Cek SMTP_HOST dan SMTP_PORT sudah benar
- Pastikan 2-Step Verification aktif di Gmail

#### 2. Cron Job Tidak Berjalan

```bash
# Pastikan script executable
chmod +x ~/dev/erm-app/scripts/send-risk-notifications.sh

# Cek logs sistem cron
log show --predicate 'process == "cron"' --last 1h  # macOS
```

#### 3. API Returns 401 Unauthorized

**Solution**:
- Pastikan CRON_API_SECRET_KEY di .env sama dengan yang digunakan di script
- Restart Next.js app setelah update .env

---

## Keamanan

### Best Practices

1. **API Key Security**
   - Jangan commit .env ke Git
   - Gunakan strong random key (min 32 chars)
   - Rotate key secara berkala

2. **SMTP Credentials**
   - Gunakan App Password, bukan password utama
   - Monitor aktivitas email yang tidak biasa

3. **Logging**
   - Log semua API calls dengan timestamp
   - Monitor failed authentication attempts

---

Last Updated: 1 Juli 2026
