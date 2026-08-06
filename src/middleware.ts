import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const rateLimitBuckets = new Map<string, number[]>();
const RATE_LIMIT_CLEANUP_INTERVAL = 10 * 60 * 1000;
const RATE_LIMIT_CLEANUP_AFTER = 5 * 60 * 1000;

function cleanupRateLimitBuckets(now: number) {
  const cutoff = now - RATE_LIMIT_CLEANUP_AFTER;
  rateLimitBuckets.forEach((timestamps, key) => {
    const remaining = timestamps.filter((t) => t > cutoff);
    if (remaining.length === 0) {
      rateLimitBuckets.delete(key);
    } else {
      rateLimitBuckets.set(key, remaining);
    }
  });
}

async function rateLimit(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (rateLimitBuckets.size > 1000) {
    cleanupRateLimitBuckets(now);
  }

  const timestamps = (rateLimitBuckets.get(identifier) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  rateLimitBuckets.set(identifier, timestamps);

  const count = timestamps.length;

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: now + windowMs,
  };
}

async function authenticateUser(request: NextRequest): Promise<{ userId: string | null; email: string | null }> {
  const authHeader = request.headers.get("authorization");
  const cookieStore = request.cookies.get("auth");

  if (cookieStore?.value) {
    try {
      const parsed = JSON.parse(cookieStore.value);
      return { userId: parsed.id || null, email: parsed.email || null };
    } catch {}
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const payload = Buffer.from(token, "base64").toString();
      const parsed = JSON.parse(payload);
      if (parsed.email) {
        return { userId: parsed.id || null, email: parsed.email };
      }
    } catch {}
  }

  return { userId: null, email: null };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  const { userId, email } = await authenticateUser(request);

  // Apply rate limiting to API routes (graceful degradation if Redis unavailable)
  if (pathname.startsWith("/api/")) {
    const identifier = userId ? `user:${userId}` : `ip:${ipAddress}`;

    try {
      const result = await rateLimit(identifier, 1000, 60000);
      if (result && !result.success) {
        return new NextResponse(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
              "X-RateLimit-Limit": result.limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": Math.ceil(result.reset / 1000).toString(),
            },
          }
        );
      }
    } catch (error) {
      console.error("Rate limiting error:", error);
      // Don't fail the request if rate limiting is unavailable
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/(app)/:path*",
  ],
};
