"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCdnUrl = toCdnUrl;
function toCdnUrl(inputUrl) {
    if (!inputUrl)
        return '';
    const CDN_BASE = process.env.CDN_BASE_URL;
    if (!CDN_BASE)
        return inputUrl;
    if (inputUrl.startsWith(CDN_BASE))
        return inputUrl;
    let url;
    try {
        url = new URL(inputUrl);
    }
    catch {
        return inputUrl;
    }
    const S3_HOSTS = (process.env.S3_PUBLIC_HOSTS ?? '')
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
    if (!S3_HOSTS.includes(url.hostname))
        return inputUrl;
    return `${CDN_BASE}${url.pathname}`;
}
//# sourceMappingURL=to-cdn-url.js.map