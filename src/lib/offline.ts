export function isOnline(nav: { onLine: boolean } = navigator): boolean {
  return nav.onLine !== false;
}

export function shouldQueueDailyCheckIn(online: boolean): boolean {
  return !online;
}

export function syncBannerText(): string {
  return "離線中，連上後會同步";
}
