// Supabase Auth "Send Email" hook: sends every auth email (sign-up confirmation, password reset, email change,
// magic link, invites, codes and security notices) through Gmail SMTP with Lucenta-branded templates.
//
// Secrets (Edge Functions > Secrets):
//   SEND_EMAIL_HOOK_SECRET  from Authentication > Hooks > Send Email (looks like "v1,whsec_...")
//   GMAIL_USER              the Gmail address that sends the emails
//   GMAIL_APP_PASSWORD      a Google app password for that account (needs 2-Step Verification)
// Deploy with JWT verification off: the hook is authenticated by its webhook signature instead.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import nodemailer from "npm:nodemailer@6.9.16";

type HookPayload = {
  user: { email: string; new_email?: string; user_metadata?: { full_name?: string } };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
    old_email?: string;
  };
};

// Links always open the live site, even for accounts created while testing locally.
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://lucenta-beige.vercel.app").replace(/\/$/, "");
const GMAIL_USER = Deno.env.get("GMAIL_USER") ?? "";
const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace("v1,whsec_", "");

// Port 587 is blocked on Supabase Edge Functions, so use implicit TLS on 465.
const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: Deno.env.get("GMAIL_APP_PASSWORD") ?? "" },
});

const BLUE = "#1d6bff";
const INK = "#0b0b0f";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// The app's /auth/confirm verifies the token hash itself, so the link works on any device.
function verifyUrl(tokenHash: string, type: string, redirectTo: string) {
  const params = new URLSearchParams({ token_hash: tokenHash, type });
  try {
    const next = new URL(redirectTo).searchParams.get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) params.set("next", next);
  } catch {
    // No usable redirect: /auth/confirm picks the default page for the type.
  }
  return `${SITE_URL}/auth/confirm?${params}`;
}

const FONT = "Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

function codeBlock(code: string) {
  const cells = [...code]
    .map((ch) => `<td style="width:44px;height:56px;border:2px solid ${INK};background:#ffffff;text-align:center;vertical-align:middle;font-family:${MONO};font-size:28px;font-weight:700;color:${INK}">${escape(ch)}</td>`)
    .join(`<td style="width:6px;font-size:0">&nbsp;</td>`);
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 0"><tr>${cells}</tr></table>`;
}

function buttonBlock(label: string, url: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0"><tr>
    <td style="background:${BLUE};border:2px solid ${INK};border-right-width:6px;border-bottom-width:6px">
      <a href="${escape(url)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;font-weight:800;color:#ffffff;text-decoration:none">${escape(label)} &rarr;</a>
    </td></tr></table>`;
}

function layout({ preheader, label, heading, body, button, code, codeNote, footnote }: {
  preheader: string;
  label: string;
  heading: string;
  body: string;
  button?: { label: string; url: string };
  code?: string;
  codeNote?: string;
  footnote: string;
}) {
  let action = "";
  if (code) {
    action += codeBlock(code);
    if (codeNote) action += `<p style="margin:12px 0 0;font-size:13px;color:#5b6070">${codeNote}</p>`;
    if (button) {
      action += `<p style="margin:26px 0 0;padding-top:18px;border-top:1px dashed #c9ccd6;font-size:13px;line-height:1.6;color:#5b6070">Prefer one click? <a href="${escape(button.url)}" style="color:${BLUE};font-weight:700">${escape(button.label)}</a></p>`;
    }
  } else if (button) {
    action += buttonBlock(button.label, button.url);
    action += `<p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#5b6070">Button not working? Copy this link into your browser:<br><a href="${escape(button.url)}" style="color:${BLUE};word-break:break-all">${escape(button.url)}</a></p>`;
  }

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:#eef0f4;font-family:${FONT};color:${INK};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escape(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f4">
    <tr><td align="center" style="padding:32px 14px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
        <tr><td style="background:#ffffff;border:2px solid ${INK};border-right-width:8px;border-bottom-width:8px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="height:6px;background:${BLUE};font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td style="padding:20px 30px;border-bottom:2px solid ${INK}">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
                <td style="font-family:${FONT};font-size:21px;font-weight:900;letter-spacing:-.02em;color:${INK}">Lucenta<span style="color:${BLUE}">.</span></td>
                <td align="right"><span style="display:inline-block;padding:5px 10px;border:2px solid ${INK};font-size:10px;font-weight:800;letter-spacing:.14em;color:${INK}">${escape(label)}</span></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:34px 30px 36px">
              <h1 style="margin:0;font-family:${FONT};font-size:28px;line-height:1.15;font-weight:900;letter-spacing:-.01em;text-transform:uppercase;color:${INK}">${escape(heading)}</h1>
              <div style="margin:10px 0 0;width:56px;height:5px;background:${BLUE};font-size:0;line-height:0">&nbsp;</div>
              <div style="margin-top:20px;font-size:16px;line-height:1.65;color:#2b2f3a">${body}</div>
              ${action}
            </td></tr>
            <tr><td style="padding:18px 30px;background:${INK};font-size:12px;line-height:1.6;color:#b9bdc9">
              ${escape(footnote)}
              <div style="margin-top:8px;color:#ffffff;font-weight:700">Lucenta <span style="color:${BLUE}">&middot;</span> <span style="font-weight:500;color:#b9bdc9">free AI website audits, AI detection &amp; writing tools</span></div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

type Mail = { to: string; subject: string; html: string; text: string };
type Content = Parameters<typeof layout>[0];

const p = (html: string) => `<p style="margin:0 0 12px">${html}</p>`;
const plain = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function compose(to: string, subject: string, c: Content): Mail {
  const text = [
    plain(c.heading),
    "",
    plain(c.body.replace(/<\/p>/g, "\n\n")).trim(),
    c.code ? `\nYour code: ${c.code}` : "",
    c.button ? `\n${c.button.label}: ${c.button.url}` : "",
    `\n${c.footnote}`,
    "\nLucenta · free AI website audits, AI detection & writing tools",
  ].join("\n");
  return { to, subject, html: layout(c), text };
}

function buildEmails({ user, email_data: d }: HookPayload): Mail[] {
  const redirect = d.redirect_to || d.site_url;
  const name = user.user_metadata?.full_name?.trim().split(/\s+/)[0];
  const hi = p(name ? `Hi ${escape(name)},` : "Hi there,");
  const ignore = "If you didn't request this, you can safely ignore this email.";

  switch (d.email_action_type) {
    case "signup":
      return [compose(user.email, `${d.token} is your Lucenta verification code`, {
        preheader: `Your code is ${d.token}. Enter it to activate your free Lucenta account.`,
        label: "VERIFY EMAIL",
        heading: "Confirm your email",
        body: hi + p("Welcome to Lucenta! Enter this code on the verification page to activate your free account:"),
        code: d.token,
        codeNote: "The code expires in 1 hour and can only be used once.",
        button: { label: "Confirm with a link instead", url: verifyUrl(d.token_hash, "signup", redirect) },
        footnote: "You're receiving this because this address was used to create a Lucenta account. " + ignore,
      })];
    case "recovery":
      return [compose(user.email, "Reset your Lucenta password", {
        preheader: "Use this link to choose a new password for your Lucenta account.",
        label: "PASSWORD RESET",
        heading: "Reset your password",
        body: hi + p("We got a request to reset the password for your Lucenta account. Click below to choose a new one. The link works once and expires in 1 hour."),
        button: { label: "Choose a new password", url: verifyUrl(d.token_hash, "recovery", redirect) },
        footnote: ignore + " Your password stays the same until you set a new one.",
      })];
    case "magiclink":
      return [compose(user.email, `${d.token} is your Lucenta login code`, {
        preheader: `Your login code is ${d.token}.`,
        label: "LOG IN",
        heading: "Log in to Lucenta",
        body: hi + p("Use this code to log in. It expires in 1 hour and can only be used once."),
        code: d.token,
        button: { label: "Log in with a link instead", url: verifyUrl(d.token_hash, "magiclink", redirect) },
        footnote: ignore,
      })];
    case "invite":
      return [compose(user.email, "You're invited to Lucenta", {
        preheader: "Accept your invite and create your free Lucenta account.",
        label: "INVITE",
        heading: "You're invited",
        body: hi + p("You've been invited to create a free Lucenta account: website audits, AI detection and writing tools in one place."),
        button: { label: "Accept invite", url: verifyUrl(d.token_hash, "invite", redirect) },
        footnote: ignore,
      })];
    case "email_change": {
      const newEmail = user.new_email ?? "";
      const mails: Mail[] = [];
      // Field names are reversed for backward compatibility: token_hash goes with the NEW address,
      // token_hash_new with the CURRENT one (only sent when Secure Email Change is on).
      if (newEmail && d.token_hash) {
        mails.push(compose(newEmail, "Confirm your new email for Lucenta", {
          preheader: "Confirm this address for your Lucenta account.",
          label: "EMAIL CHANGE",
          heading: "Confirm your new email",
          body: hi + p(`Confirm that you want to use <strong>${escape(newEmail)}</strong> for your Lucenta account.`),
          button: { label: "Confirm new email", url: verifyUrl(d.token_hash, "email_change", redirect) },
          footnote: ignore,
        }));
      }
      if (d.token_hash_new) {
        mails.push(compose(user.email, "Confirm your Lucenta email change", {
          preheader: "Someone asked to change the email on your Lucenta account.",
          label: "EMAIL CHANGE",
          heading: "Confirm email change",
          body: hi + p(`We got a request to change your Lucenta email from <strong>${escape(user.email)}</strong> to <strong>${escape(newEmail)}</strong>. Confirm it's you.`),
          button: { label: "Confirm change", url: verifyUrl(d.token_hash_new, "email_change", redirect) },
          footnote: "If you didn't ask for this, don't click the link and change your password.",
        }));
      }
      return mails;
    }
    case "reauthentication":
    case "email":
      return [compose(user.email, `${d.token} is your Lucenta verification code`, {
        preheader: `Your code is ${d.token}.`,
        label: "VERIFY",
        heading: "Your verification code",
        body: hi + p("Enter this code in Lucenta to continue."),
        code: d.token,
        codeNote: "The code expires soon and can only be used once.",
        footnote: ignore,
      })];
    default: {
      const NOTICES: Record<string, [string, string]> = {
        password_changed_notification: ["Your password was changed", "The password for your Lucenta account was just changed."],
        email_changed_notification: ["Your email was changed", `The email on your Lucenta account was changed${d.old_email ? ` from ${escape(d.old_email)}` : ""}.`],
        identity_linked_notification: ["New sign-in method added", "A new sign-in method was linked to your Lucenta account."],
        identity_unlinked_notification: ["Sign-in method removed", "A sign-in method was removed from your Lucenta account."],
      };
      const notice = NOTICES[d.email_action_type];
      if (!notice) return [];
      return [compose(user.email, `Lucenta: ${notice[0].toLowerCase()}`, {
        preheader: notice[1],
        label: "SECURITY",
        heading: notice[0],
        body: hi + p(notice[1]),
        footnote: "If this wasn't you, reset your password right away.",
      })];
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const payload = await req.text();
  let data: HookPayload;
  try {
    data = new Webhook(hookSecret).verify(payload, Object.fromEntries(req.headers)) as HookPayload;
  } catch {
    return Response.json({ error: { http_code: 401, message: "Invalid signature" } }, { status: 401 });
  }

  try {
    for (const mail of buildEmails(data)) {
      await transport.sendMail({ from: `"Lucenta" <${GMAIL_USER}>`, ...mail });
    }
  } catch (error) {
    console.error("send-email failed", error);
    return Response.json({ error: { http_code: 500, message: "Could not send the email. Please try again." } }, { status: 500 });
  }

  return Response.json({});
});
