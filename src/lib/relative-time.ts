// Compact "time ago" formatter, focused on minutes for recent activity.
export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return "Never seen";
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

export function lastSeenLabel(isOnline: boolean, lastSeenAt: string | null | undefined): string {
  if (isOnline) return "Online now";
  if (!lastSeenAt) return "Never seen";
  return `Last seen ${timeAgo(lastSeenAt)}`;
}
