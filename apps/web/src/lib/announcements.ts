export type Announcement = {
  id: string;
  startsAt: string;
  days: number;
  message: string;
  cta: { label: string; href: string };
};

/** Shown in the header for `days` days from `startsAt`, then it disappears on its own. */
export const ANNOUNCEMENT: Announcement | null = {
  id: "freelancer-profiles",
  startsAt: "2026-09-27T00:00:00Z",
  days: 7,
  message: "New: developer and writer profiles are live. Get hired by people who use Lucenta.",
  cta: { label: "Set up yours", href: "/dashboard/freelancer" },
};

export function isAnnouncementActive(a: Announcement, now = Date.now()) {
  const start = new Date(a.startsAt).getTime();
  return now >= start && now < start + a.days * 86_400_000;
}
