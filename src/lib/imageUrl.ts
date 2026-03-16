function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveApiOrigin(): string {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBase) {
    try {
      return new URL(envBase).origin;
    } catch {
      // Fall through to runtime-based fallback.
    }
  }

  if (typeof window !== "undefined") {
    if (isLocalHostname(window.location.hostname)) {
      return "http://localhost:8000";
    }

    return window.location.origin.replace(/\/+$/, "");
  }

  return "http://localhost:8000";
}

function rewriteDottedBucketS3Url(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const hostParts = parsed.hostname.split(".");
    const s3Index = hostParts.findIndex((part) => part === "s3");

    // Virtual-hosted-style S3 URL: <bucket>.s3.<region>.amazonaws.com
    if (s3Index <= 0 || !parsed.hostname.endsWith(".amazonaws.com")) {
      return urlString;
    }

    const bucketName = hostParts.slice(0, s3Index).join(".");
    if (!bucketName.includes(".")) {
      return urlString;
    }

    const s3Host = hostParts.slice(s3Index).join(".");
    const pathname = parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`;
    parsed.hostname = s3Host;
    parsed.pathname = `/${bucketName}${pathname}`;
    return parsed.toString();
  } catch {
    return urlString;
  }
}

export function resolveImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Some backends may serialize URL strings with wrapping quotes.
  const unwrapped = trimmed.replace(/^['"]+|['"]+$/g, "");
  if (!unwrapped) return null;

  if (/^data:image\//i.test(unwrapped)) return unwrapped;
  if (/^https?:\/\//i.test(unwrapped)) return encodeURI(rewriteDottedBucketS3Url(unwrapped));
  if (unwrapped.startsWith("//")) return encodeURI(rewriteDottedBucketS3Url(`https:${unwrapped}`));

  const normalizedPath = unwrapped.startsWith("/") ? unwrapped : `/${unwrapped}`;
  return encodeURI(`${resolveApiOrigin()}${normalizedPath}`);
}
