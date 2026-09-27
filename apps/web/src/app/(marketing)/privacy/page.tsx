import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT, LegalDocument, type LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data Lucenta collects, how it's used, who processes it, and the choices and rights you have.",
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <p>
        Lucenta (&quot;we&quot;, &quot;us&quot;), based in Osun State, Nigeria, is the data controller for the personal data
        described here. We process personal data in line with the Nigeria Data Protection Act 2023 and, where it applies to you,
        the EU/UK GDPR. Contact: <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "Information we collect",
    content: (
      <>
        <h3>Account information</h3>
        <p>
          Your name, email address, date of birth and password when you sign up. Passwords are hashed by our authentication
          provider, so we never see them. If you choose Google sign-in, we receive your name, email and profile picture from
          Google, and ask for your date of birth separately. We use your date of birth only to confirm you meet the minimum age
          of 16; it&apos;s never shown publicly and can&apos;t be changed once saved.
        </p>
        <h3>Onboarding answers</h3>
        <p>
          After you sign up we ask for your <strong>occupation</strong> (for example student, teacher, writer or developer) and{" "}
          <strong>how you heard about Lucenta</strong> (for example Cursor, X, Instagram, Facebook, ChatGPT, Claude, an ad, or a
          source you describe yourself). Your occupation decides which tools are available to you. Your answers are never shown
          publicly, and you can update them in <Link href="/dashboard/settings">Settings</Link> (occupation at most once every 30
          days).
        </p>
        <h3>Device and network records</h3>
        <p>
          Each person may have one Lucenta account and one set of free daily limits per device. To enforce this, when you sign
          up or log in we record a random device identifier stored in your browser, a device fingerprint (a summary of
          technical characteristics such as screen size, graphics hardware, timezone and how your browser draws text), and
          your IP address. We store all of them only as keyed one-way hashes, not in readable form, and use them solely to
          prevent duplicate accounts and abuse. If a new account&apos;s fingerprint matches an existing account, the two
          accounts share one set of daily limits. These records are kept after an account is deleted so the rules can&apos;t be
          bypassed by deleting and re-creating accounts. We also reject disposable email addresses and variations of an email
          that already has an account.
        </p>
        <h3>Profile information (optional)</h3>
        <p>Username, bio, company, job title, website, location and profile photo, if you add them.</p>
        <h3>Content you submit</h3>
        <ul>
          <li>
            <strong>Website audits:</strong> the URLs you scan and the reports we generate. These are saved to your history so
            you can view them again.
          </li>
          <li>
            <strong>Text for the AI Detector and Humanizer:</strong> the text you paste and the results. These are saved to your
            history <strong>only if &quot;Save history&quot; is on</strong> in Settings. With it off, your text is processed and
            then discarded.
          </li>
        </ul>
        <h3>Usage records</h3>
        <p>
          To enforce the free daily limits we record how many audits and texts you&apos;ve used each day. For texts we store a
          one-way fingerprint (a SHA-256 hash) rather than the text itself. It can&apos;t be turned back into your words.
        </p>
        <h3>Technical information</h3>
        <p>
          Like most websites, our hosting and database providers log basic technical data such as IP address, browser type and
          request times, used for security, abuse prevention and fixing errors.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    content: (
      <>
        <p>We keep this minimal:</p>
        <ul>
          <li>
            <strong>Essential cookies</strong> keep you signed in securely and hold a random device identifier used to enforce one
            account per person. The Service can&apos;t work without them.
          </li>
          <li>
            <strong>Browser storage</strong> remembers your theme (dark/light), keeps a copy of the device identifier, and
            briefly holds text you send from the Detector to the Humanizer.
          </li>
        </ul>
        <p>We don&apos;t use advertising cookies, and we don&apos;t currently use third-party analytics or tracking pixels.</p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    content: (
      <ul>
        <li>
          <strong>To provide the Service:</strong> run audits, detect and rewrite text, show your history and manage your
          account (performance of our contract with you).
        </li>
        <li>
          <strong>To tailor tool access:</strong> we use your occupation to decide which tools you can use. To support academic
          integrity, the Humanizer isn&apos;t available on student accounts, while the AI Detector and Website Analyzer are
          (performance of our contract with you).
        </li>
        <li>
          <strong>To understand how people find us:</strong> we look at how-you-heard answers in aggregate to decide where to
          share Lucenta. We don&apos;t pass them to the platforms you name (our legitimate interests).
        </li>
        <li>
          <strong>To keep Lucenta safe and fair:</strong> enforce daily limits, prevent abuse and misuse described in our{" "}
          <Link href="/responsible-use">Responsible Use Policy</Link>, and secure accounts (our legitimate interests).
        </li>
        <li>
          <strong>To communicate with you:</strong> service emails such as sign-up confirmation and password resets, and
          important changes to our terms. Optional emails only if you&apos;ve turned them on in Settings (consent).
        </li>
        <li>
          <strong>To improve Lucenta:</strong> using aggregated, non-identifying statistics such as how many scans run each day.
        </li>
        <li>
          <strong>To meet legal obligations:</strong> for example responding to lawful requests from authorities.
        </li>
      </ul>
    ),
  },
  {
    id: "ai-processing",
    title: "How AI processing works",
    content: (
      <>
        <p>
          The AI Detector&apos;s scoring runs on our own servers. To humanize text, check meaning, and review websites, we send
          the relevant text or page content to AI models through <strong>OpenRouter</strong>, which routes requests to model
          providers (currently models such as Meta Llama and Google Gemini). They process it only to return your result.
        </p>
        <p>
          <strong>We don&apos;t use your content to train AI models</strong>, and we don&apos;t send your name or email with
          these requests. AI providers process data under their own terms and privacy policies. Please don&apos;t submit
          sensitive personal data (such as health, financial or identity details) in text you check or rewrite.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    content: (
      <>
        <p>
          <strong>We never sell your personal data</strong> and we don&apos;t share it for advertising. We share it only with
          providers who help us run Lucenta, under agreements that limit how they can use it:
        </p>
        <ul>
          <li>
            <strong>Supabase:</strong> database, authentication and file storage.
          </li>
          <li>
            <strong>OpenRouter and its AI model providers:</strong> to generate humanized text, meaning checks and website
            reviews.
          </li>
          <li>
            <strong>Our hosting provider:</strong> to serve the website and run the Service.
          </li>
          <li>
            <strong>Google:</strong> only if you choose to sign in with Google.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, to protect people&apos;s safety or rights, or as part of a merger
          or sale of the business (in which case this policy would continue to protect your data). When you contact a developer
          via WhatsApp, phone or email, that conversation happens in those apps, and we don&apos;t see it.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "International transfers",
    content: (
      <p>
        Some of our providers store or process data outside Nigeria, including in the United States and the European Union. When
        that happens we rely on appropriate safeguards recognised under the Nigeria Data Protection Act and GDPR, such as
        contractual protections offered by those providers.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    content: (
      <ul>
        <li>
          <strong>Account and profile data:</strong> until you delete your account.
        </li>
        <li>
          <strong>History (scans, text checks):</strong> until you delete individual items, clear your history in Settings, or
          delete your account.
        </li>
        <li>
          <strong>Text with history off:</strong> not stored after processing. We keep only the usage fingerprint described above.
        </li>
        <li>
          <strong>Hashed device and network records:</strong> for as long as the Service runs, so the one-account rule keeps
          working. They can&apos;t be used to identify you on their own.
        </li>
        <li>
          <strong>Usage records and security logs:</strong> only as long as needed to enforce limits, prevent abuse and keep the
          Service secure.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    content: (
      <p>
        All traffic is encrypted with HTTPS. Our database uses row-level security so each account can only access its own data,
        passwords are hashed, and access to production systems is restricted. No system is perfectly secure, but if a breach
        affecting your data ever happens, we&apos;ll notify you and the relevant authority as the law requires.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    content: (
      <>
        <p>You can:</p>
        <ul>
          <li>
            <strong>Access and correct</strong> your information on your <Link href="/dashboard/profile">Profile</Link> page, and
            your occupation and how-you-heard answer in <Link href="/dashboard/settings">Settings</Link>. Your date of birth
            can&apos;t be edited; if it&apos;s wrong, email us.
          </li>
          <li>
            <strong>Turn off history</strong> or <strong>delete all history</strong> in <Link href="/dashboard/settings">Settings</Link>.
          </li>
          <li>
            <strong>Delete your account</strong> and associated data from Profile → Danger zone.
          </li>
          <li>
            <strong>Request a copy</strong> of your data, or ask us to restrict or stop certain processing, by emailing{" "}
            <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
          </li>
          <li>
            <strong>Withdraw consent</strong> for optional emails at any time in Settings.
          </li>
        </ul>
        <p>
          We respond to requests within 30 days. If you&apos;re unhappy with how we handle your data, you can complain to the
          Nigeria Data Protection Commission (NDPC) or your local data protection authority.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        Lucenta is not intended for children under 16. Sign-ups with a date of birth under 16 are rejected and we don&apos;t
        knowingly collect their personal data. If you believe a child has created an account, contact us and we&apos;ll delete
        it.
      </p>
    ),
  },
  {
    id: "other-sites",
    title: "Links to other sites",
    content: (
      <p>
        Reports, developer profiles and our footer link to other websites and apps (such as the sites you audit, portfolios,
        WhatsApp, X, Facebook and Instagram). Their privacy practices are their own, so please review their policies.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We&apos;ll update this policy when our practices change, for example if we add analytics or paid plans. For significant
        changes we&apos;ll notify you by email or in the app, and the date at the top will always show the latest version.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      current="/privacy"
      title="Privacy Policy"
      intro={
        <>
          <p>
            Your privacy matters to us. This policy explains what information Lucenta collects when you use our Website Analyzer,
            AI Text Detector and Humanizer, why we collect it, who processes it, and the control you have over it.
          </p>
          <p className="rounded-2xl border p-4">
            <strong>The short version:</strong> we collect only what we need to run Lucenta, we never sell your data, your text
            is only kept if you choose to save history, and we don&apos;t use your content to train AI models.
          </p>
        </>
      }
      sections={sections}
    />
  );
}
