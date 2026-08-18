# NPM Scripts untuk Notification System

Tambahkan scripts berikut ke package.json untuk memudahkan development:

```json
{
  "scripts": {
    // ... existing scripts ...
    
    "notify:test:h7": "tsx scripts/send-risk-notifications.sh 7",
    "notify:test:h5": "tsx scripts/send-risk-notifications.sh 5",
    "notify:test:h1": "tsx scripts/send-risk-notifications.sh 1",
    "notify:test:all": "npm run notify:test:h7 && npm run notify:test:h5 && npm run notify:test:h1",
    "notify:logs:h7": "tail -f logs/cron-h7.log",
    "notify:logs:h5": "tail -f logs/cron-h5.log",
    "notify:logs:h1": "tail -f logs/cron-h1.log"
  }
}
```

## Usage:

```bash
# Test individual notifications
npm run notify:test:h7
npm run notify:test:h5
npm run notify:test:h1

# Test all at once
npm run notify:test:all

# Monitor logs
npm run notify:logs:h7
npm run notify:logs:h5
npm run notify:logs:h1
```

## Alternative - Manual Commands:

```bash
# Direct shell script
./scripts/send-risk-notifications.sh 7

# Or via curl
curl -X POST http://localhost:3000/api/notifications/risk-reminder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_API_SECRET_KEY}" \
  -d '{"daysBeforeDeadline": 7}'
```
