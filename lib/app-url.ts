import { NextRequest } from 'next/server';

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

function normalizeBaseUrl(url?: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return null;
  }
}

function isLocalBaseUrl(url: string) {
  try {
    return LOCAL_HOST_PATTERN.test(new URL(url).host);
  } catch {
    return false;
  }
}

function getConfiguredBaseUrl() {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized && (process.env.NODE_ENV !== 'production' || !isLocalBaseUrl(normalized))) {
      return normalized;
    }
  }

  return null;
}

function getForwardedBaseUrl(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const host = forwardedHost || request.headers.get('host');

  if (!host) return null;

  return normalizeBaseUrl(`${forwardedProto}://${host}`);
}

export function getAppBaseUrl(request?: NextRequest) {
  const configuredBaseUrl = getConfiguredBaseUrl();
  if (configuredBaseUrl) return configuredBaseUrl;

  if (request) {
    const forwardedBaseUrl = getForwardedBaseUrl(request);
    if (forwardedBaseUrl && (process.env.NODE_ENV !== 'production' || !isLocalBaseUrl(forwardedBaseUrl))) {
      return forwardedBaseUrl;
    }

    const requestBaseUrl = normalizeBaseUrl(request.url);
    if (requestBaseUrl && (process.env.NODE_ENV !== 'production' || !isLocalBaseUrl(requestBaseUrl))) {
      return requestBaseUrl;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Public app URL is not configured. Set APP_URL or NEXT_PUBLIC_APP_URL to your production domain.');
  }

  return 'http://localhost:3000';
}
