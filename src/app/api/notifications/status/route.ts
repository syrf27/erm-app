import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Monitoring endpoint untuk melihat status notifikasi
 * Endpoint: GET /api/notifications/status
 * 
 * Query params:
 * - apiKey: Secret key untuk authentication (atau via Bearer token)
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.nextUrl.searchParams.get('apiKey');
    const validKey = process.env.CRON_API_SECRET_KEY || '';

    if (!authHeader?.includes(validKey) && apiKey !== validKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get upcoming risks counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const h7Date = new Date(today);
    h7Date.setDate(h7Date.getDate() + 7);
    const h7NextDay = new Date(h7Date);
    h7NextDay.setDate(h7NextDay.getDate() + 1);

    const h5Date = new Date(today);
    h5Date.setDate(h5Date.getDate() + 5);
    const h5NextDay = new Date(h5Date);
    h5NextDay.setDate(h5NextDay.getDate() + 1);

    const h1Date = new Date(today);
    h1Date.setDate(h1Date.getDate() + 1);
    const h1NextDay = new Date(h1Date);
    h1NextDay.setDate(h1NextDay.getDate() + 1);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const [h7Count, h5Count, h1Count] = await Promise.all([
      prisma.rencanaPenanganan.count({
        where: {
          realisasiWaktu: { gte: fmt(h7Date), lt: fmt(h7NextDay) },
        },
      }),
      prisma.rencanaPenanganan.count({
        where: {
          realisasiWaktu: { gte: fmt(h5Date), lt: fmt(h5NextDay) },
        },
      }),
      prisma.rencanaPenanganan.count({
        where: {
          realisasiWaktu: { gte: fmt(h1Date), lt: fmt(h1NextDay) },
        },
      }),
    ]);

    // Read cron logs (last 20 lines)
    const logsDir = path.join(process.cwd(), 'logs');
    const logs = {
      h7: readLastLines(path.join(logsDir, 'cron-h7.log'), 20),
      h5: readLastLines(path.join(logsDir, 'cron-h5.log'), 20),
      h1: readLastLines(path.join(logsDir, 'cron-h1.log'), 20),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      upcomingRisks: {
        h7: { count: h7Count, targetDate: h7Date.toISOString() },
        h5: { count: h5Count, targetDate: h5Date.toISOString() },
        h1: { count: h1Count, targetDate: h1Date.toISOString() },
      },
      recentLogs: logs,
      systemInfo: {
        nodeEnv: process.env.NODE_ENV,
        smtpConfigured: !!process.env.SMTP_USER,
        cronApiKeyConfigured: !!process.env.CRON_API_SECRET_KEY,
      },
    });
  } catch (error: any) {
    console.error('Error in monitoring endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function readLastLines(filePath: string, numLines: number): string[] {
  try {
    if (!fs.existsSync(filePath)) {
      return ['Log file not found'];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(-numLines);
  } catch (error: any) {
    return [`Error reading log: ${error.message}`];
  }
}
