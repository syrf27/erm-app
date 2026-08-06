#!/bin/bash

# Script untuk menjalankan notifikasi risiko
# Digunakan oleh cron job untuk mengirim reminder H-7, H-5, dan H-1

# Set environment variables
export NODE_ENV=production

# Load environment variables dari .env
if [ -f ~/dev/erm-app/.env ]; then
  export $(cat ~/dev/erm-app/.env | grep -v '^#' | xargs)
fi

# API endpoint
API_URL="http://localhost:3000/api/notifications/risk-reminder"

# Function untuk mengirim notifikasi
send_notification() {
  local DAYS=$1
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sending H-$DAYS notification..."
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRON_API_SECRET_KEY" \
    -d "{\"daysBeforeDeadline\": $DAYS}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ H-$DAYS notification sent successfully"
    echo "$BODY" | jq '.'
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Failed to send H-$DAYS notification (HTTP $HTTP_CODE)"
    echo "$BODY"
  fi
  
  echo "---"
}

# Main
NOTIFICATION_TYPE=$1

case $NOTIFICATION_TYPE in
  7)
    send_notification 7
    ;;
  5)
    send_notification 5
    ;;
  1)
    send_notification 1
    ;;
  *)
    echo "Usage: $0 {7|5|1}"
    echo "  7 = H-7 notification"
    echo "  5 = H-5 notification"
    echo "  1 = H-1 notification"
    exit 1
    ;;
esac
