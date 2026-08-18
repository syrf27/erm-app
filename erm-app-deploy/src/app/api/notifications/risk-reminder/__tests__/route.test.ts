/**
 * Test file untuk API notification endpoint
 * 
 * Untuk menjalankan test:
 * 1. Pastikan database sudah running
 * 2. Pastikan .env sudah dikonfigurasi
 * 3. Run: npm test (atau jest jika sudah setup)
 */

describe('Risk Notification API', () => {
  const validApiKey = process.env.CRON_API_SECRET_KEY;

  it('should return 401 without API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/risk-reminder', {
      method: 'POST',
      body: JSON.stringify({ daysBeforeDeadline: 7 }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('should return 401 with invalid API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/risk-reminder', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ daysBeforeDeadline: 7 }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('should return 400 with invalid daysBeforeDeadline', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/risk-reminder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ daysBeforeDeadline: 10 }), // Invalid: should be 7, 5, or 1
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 200 with valid request', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/risk-reminder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ daysBeforeDeadline: 7 }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('daysBeforeDeadline', 7);
  });
});

/**
 * Manual test dengan curl:
 * 
 * curl -X POST http://localhost:3000/api/notifications/risk-reminder \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer YOUR_SECRET_KEY" \
 *   -d '{"daysBeforeDeadline": 7}'
 */
