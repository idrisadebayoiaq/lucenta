/** Well-known email providers accepted for sign-up. Keep in sync with public.is_allowed_email() in the database. */
export const ALLOWED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "live.com",
  "live.co.uk",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "aol.com",
  "zoho.com",
  "zohomail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "yandex.com",
  "tutanota.com",
  "tuta.io",
  "fastmail.com",
]);

export const EMAIL_PROVIDER_MESSAGE = "Please use an email from a well-known provider such as Gmail, Outlook, Yahoo, iCloud or Proton.";

export function isAllowedEmailDomain(email: string) {
  return ALLOWED_EMAIL_DOMAINS.has(email.split("@")[1]?.trim().toLowerCase() ?? "");
}
