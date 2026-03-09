export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp?.trim()) {
      return firstIp.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp?.trim()) {
    return cloudflareIp.trim();
  }

  return "unknown";
}
