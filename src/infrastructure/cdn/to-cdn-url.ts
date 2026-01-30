export function toCdnUrl(inputUrl: string | null | undefined): string {
  if (!inputUrl) return '';

  const CDN_BASE = process.env.CDN_BASE_URL;
  if (!CDN_BASE) return inputUrl;

  // Already CDN
  if (inputUrl.startsWith(CDN_BASE)) return inputUrl;

  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return inputUrl;
  }

  const S3_HOSTS = (process.env.S3_PUBLIC_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  // Only rewrite known S3 hosts
  if (!S3_HOSTS.includes(url.hostname)) return inputUrl;

  // IMPORTANT: drop query params for better caching
  return `${CDN_BASE}${url.pathname}`;
}
