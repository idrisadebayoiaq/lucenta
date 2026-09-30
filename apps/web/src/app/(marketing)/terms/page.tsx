import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT, LegalDocument, type LegalSection } from "@/components/legal-document";
import { DAILY_CONTENT_LIMIT, DAILY_SCAN_LIMIT, MAX_TEXT_CHARS } from "@/lib/limits";
import { OCCUPATION_LOCK_DAYS } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use Lucenta's Website Analyzer, AI Text Detector and Rewriter.",
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "About these terms",
    content: (
      <>
        <p>
          These Terms of Use (&quot;Terms&quot;) are an agreement between you and Lucenta (&quot;Lucenta&quot;,
          &quot;we&quot;, &quot;us&quot;), based in Osun State, Nigeria. They apply to our website, dashboard
          and all tools (together, the &quot;Service&quot;).
        </p>
        <p>
          By creating an account or using the Service you agree to these Terms, our{" "}
          <Link href="/responsible-use">Responsible Use Policy</Link> (which forms part of these Terms) and our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the Service.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use Lucenta",
    content: (
      <p>
        You must be at least 16 years old (or the minimum age for digital consent where you live, if higher). If you are under
        18, you confirm that a parent or guardian has reviewed these Terms with you. If you use Lucenta on behalf of a company
        or organisation, you confirm you have authority to accept these Terms for it.
      </p>
    ),
  },
  {
    id: "account",
    title: "Your account",
    content: (
      <ul>
        <li>Give accurate information and keep it up to date.</li>
        <li>Keep your password secure and don&apos;t share your account. You are responsible for activity on it.</li>
        <li>
          One person, one account. Only one account can be created per device, and we limit new accounts per network. Creating
          extra accounts to get around daily limits is not allowed.
        </li>
        <li>
          The date of birth you give must be accurate. It can&apos;t be changed once saved, sign-ups under 16 are rejected, and
          accounts belonging to anyone under 16 will be closed.
        </li>
        <li>
          The occupation you choose during onboarding must be accurate and kept up to date in Settings. You can change it at
          most once every {OCCUPATION_LOCK_DAYS} days. Choosing a different occupation to unlock tools that aren&apos;t
          available to you is a breach of these Terms.
        </li>
        <li>
          Tell us straight away at <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a> if you think your account has been
          accessed without permission.
        </li>
      </ul>
    ),
  },
  {
    id: "service",
    title: "The Service and free limits",
    content: (
      <>
        <p>
          Lucenta is currently free. Each account can run {DAILY_SCAN_LIMIT} website audits and check or improve{" "}
          {DAILY_CONTENT_LIMIT} texts (up to {MAX_TEXT_CHARS.toLocaleString()} characters each) per day. Limits reset at midnight
          UTC.
        </p>
        <p>
          We may change features and limits, add paid options in the future, or pause parts of the Service for maintenance. If
          we introduce paid plans, we&apos;ll explain the pricing clearly before you pay anything, and free features you already
          use won&apos;t be charged for without your agreement. Tools marked &quot;coming soon&quot; are plans, not promises.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>
            engage in <strong>academic dishonesty</strong>, including submitting AI-generated or rewritten work for assessment
            where that isn&apos;t allowed, or without the disclosure your institution requires;
          </li>
          <li>hide the use of AI where an employer, client, publisher, platform, competition or law requires you to disclose it;</li>
          <li>plagiarise, or rewrite other people&apos;s work to pass it off as your own or to avoid recognition;</li>
          <li>create spam, fake reviews or testimonials, impersonation, scams, fraud, or misinformation;</li>
          <li>submit content that is illegal, infringes someone else&apos;s rights, or harasses, threatens or exploits anyone;</li>
          <li>
            scan websites you don&apos;t own or aren&apos;t authorised to test in order to look for vulnerabilities to exploit, or
            use the analyzer to overload or attack any site;
          </li>
          <li>
            get around daily limits or security (for example with multiple accounts, scripts, bots or scraping), or interfere
            with the Service;
          </li>
          <li>copy, resell or reverse-engineer the Service, or use it to build a competing product.</li>
        </ul>
      </>
    ),
  },
  {
    id: "ai-tools",
    title: "AI Text Detector and Rewriter",
    content: (
      <>
        <h3>Students and the Rewriter</h3>
        <p>
          To support academic integrity, student accounts can use the Rewriter&apos;s Suggestions mode, which explains what to
          improve without rewriting anything, but not its Rewrite mode. Students can use the AI Text Detector and the Website
          Analyzer as normal. As with any occupation, once you choose Student you can&apos;t change it for{" "}
          {OCCUPATION_LOCK_DAYS} days. If your situation genuinely changes (for example you graduate or start working),
          update your occupation in Settings after that period. We may restrict accounts that appear to misrepresent their
          occupation.
        </p>
        <h3>Detection results are estimates</h3>
        <p>
          The AI Text Detector gives a <strong>probability based on writing patterns, not proof</strong> of how a text was
          written. It can be wrong in both directions. You agree not to use a Lucenta result as the only basis for any decision
          that affects another person, such as grading, disciplinary action, hiring, firing or publishing an accusation.
        </p>
        <h3>Document uploads</h3>
        <p>
          Only upload documents you have the right to share. Long documents are checked in parts, and each part counts as one
          of your daily texts. Formatting, images and anything the file doesn&apos;t store as text (such as scanned pages) are
          not checked.
        </p>
        <h3>You are responsible for Rewriter output</h3>
        <p>
          The Rewriter is a writing aid for improving clarity, tone and flow. You remain the author of anything you publish or
          submit, you must review output before using it, and you must follow any rules that restrict or require disclosure of
          AI assistance. We don&apos;t guarantee that rewritten text will receive any particular result from Lucenta or any
          third-party detector, and we don&apos;t offer the Rewriter as a way to evade them. Suggestions are automated and may
          be wrong; use your own judgement.
        </p>
        <p>
          See the <Link href="/responsible-use">Responsible Use Policy</Link> for full details, including guidance for students
          and educators.
        </p>
      </>
    ),
  },
  {
    id: "website-analyzer",
    title: "Website Analyzer",
    content: (
      <p>
        The analyzer fetches publicly available pages and files (such as robots.txt, sitemaps, images and scripts) of the URL you
        enter, the same way a browser would, and asks an AI model to review the page content. Reports are automated estimates
        and suggestions. They are not a security penetration test, legal compliance review or guarantee of search rankings. AI
        suggestions can be inaccurate, so check them before making changes.
      </p>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    content: (
      <>
        <p>
          You keep all rights to the text, URLs and other content you submit (&quot;Your Content&quot;) and to the results we
          generate for you. You give us a limited licence to store and process Your Content only to provide and secure the
          Service, including sending it to our AI providers to generate your results, as described in the{" "}
          <Link href="/privacy">Privacy Policy</Link>. We don&apos;t use Your Content to train AI models.
        </p>
        <p>You confirm you have the right to submit Your Content and that doing so doesn&apos;t break any law or agreement.</p>
      </>
    ),
  },
  {
    id: "freelancers",
    title: "Freelancers: developers and writers",
    content: (
      <>
        <h3>Hiring a freelancer</h3>
        <p>
          Lucenta lists independent developers and content writers. Website reports suggest developers whose specialties match
          the issues found, and the writing tools may suggest writers who specialise in the kind of content you&apos;re working on.
          Suggestions are automated and aren&apos;t endorsements. A &quot;Verified&quot; badge only means we&apos;ve checked who
          the person is, not the quality of their work. Any project, price, payment or agreement is strictly between you and the
          freelancer. Lucenta is not a party to it, doesn&apos;t take a fee, and isn&apos;t responsible for work carried out.
          Contacting a freelancer through WhatsApp, phone or email happens directly in those apps.
        </p>
        <h3>Listing yourself as a freelancer</h3>
        <p>If you create a freelancer profile, you agree that:</p>
        <ul>
          <li>you are at least 18 years old and the profile represents you, not someone else;</li>
          <li>
            everything on it (name, photo, experience, portfolio images, services and contact details) is accurate and yours to
            share, and you have the rights to every image you upload;
          </li>
          <li>
            your profile, including the contact details you add, is <strong>public</strong> and can be seen by anyone, including
            people who aren&apos;t signed in;
          </li>
          <li>
            you won&apos;t write, rewrite or complete <strong>graded or assessed work for students</strong> (essays, assignments,
            theses, exam answers and similar), or offer any service meant to help people cheat, hide AI use where disclosure is
            required, or pass off work as their own;
          </li>
          <li>you won&apos;t use your listing for spam, scams, misleading claims or anything illegal.</li>
        </ul>
        <p>
          You can edit, hide or delete your profile at any time from <strong>Freelancer profile</strong> in your dashboard. We may
          hide or remove profiles that break these rules or that we receive credible complaints about.
        </p>
      </>
    ),
  },
  {
    id: "our-ip",
    title: "Our intellectual property",
    content: (
      <p>
        The Service, including its software, design, text, logos and the Lucenta name, belongs to us and is protected by law.
        These Terms don&apos;t give you any right to use our brand or code except to use the Service as intended.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and closing your account",
    content: (
      <p>
        You can delete your account at any time from <strong>Profile → Danger zone</strong>. We may warn, restrict, suspend or
        close an account that breaks these Terms or the Responsible Use Policy, puts other users or the Service at risk, or where
        the law requires it. Where reasonable, we&apos;ll tell you why.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    content: (
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we don&apos;t
        promise that it will be uninterrupted, error-free, or that results (scores, detection percentages, rewrites or
        suggestions) will be accurate or fit for a particular purpose.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <p>
        To the extent the law allows, Lucenta won&apos;t be liable for indirect or consequential losses (such as lost profits,
        data, reputation or opportunities), or for decisions you or others make based on results from the Service. Our total
        liability for any claim relating to the Service is limited to the greater of the amount you paid us in the 12 months
        before the claim or ₦50,000. Nothing in these Terms limits liability that can&apos;t be limited by law, or your rights
        as a consumer.
      </p>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    content: (
      <p>
        If you misuse the Service or break these Terms (for example by using the Rewriter for academic dishonesty or the
        analyzer against a site without permission) and someone makes a claim against us as a result, you agree to cover the
        reasonable costs we incur because of it.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    content: (
      <p>
        These Terms are governed by the laws of the Federal Republic of Nigeria. We&apos;ll always try to resolve problems
        informally first, so please email us. If that doesn&apos;t work, disputes will be handled by the courts of Nigeria, unless
        the consumer law where you live gives you the right to bring a claim locally.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: (
      <p>
        We may update these Terms as Lucenta grows. If a change is significant, we&apos;ll let you know by email or in the app
        before it takes effect. Continuing to use the Service after that means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Lucenta · Osun State, Nigeria · <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      current="/terms"
      title="Terms of Use"
      intro={
        <p>
          Thanks for using Lucenta. These Terms explain your rights and responsibilities when you use our Website Analyzer, AI Text
          Detector and Rewriter. We&apos;ve tried to keep them readable, so please take a few minutes to go through them.
        </p>
      }
      sections={sections}
    />
  );
}
