import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT, LegalDocument, type LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Responsible Use",
  description: "How Lucenta's AI Detector and Rewriter should and shouldn't be used. Lucenta does not support academic dishonesty or deception.",
};

const sections: LegalSection[] = [
  {
    id: "our-position",
    title: "Our position",
    content: (
      <>
        <p>
          Lucenta&apos;s writing tools exist to help people <strong>write more clearly</strong> and to{" "}
          <strong>understand AI-generated content</strong>. They are not built to help anyone deceive a teacher, examiner,
          employer, client, publisher or reader, and we don&apos;t market them that way.
        </p>
        <p>
          We will never advertise Lucenta as a way to &quot;bypass&quot;, &quot;beat&quot; or &quot;fool&quot; AI detectors or
          plagiarism checkers, and we don&apos;t promise any particular score on any third-party tool. If the rules you write
          under forbid AI assistance or require you to disclose it, those rules come first. This policy and our{" "}
          <Link href="/terms">Terms of Use</Link> require you to follow them.
        </p>
      </>
    ),
  },
  {
    id: "ai-detector",
    title: "The AI Text Detector",
    content: (
      <>
        <h3>What it&apos;s for</h3>
        <ul>
          <li>Checking whether content you received (a guest post, a supplier&apos;s copy, a job application) may be AI-written, so you can ask better questions.</li>
          <li>Reviewing your own writing before you publish or submit it, to spot passages that read as generic or machine-like.</li>
          <li>Editors, teachers and moderators who want a starting point for a conversation, not a verdict.</li>
          <li>Learning what makes writing sound robotic (repetitive sentence lengths, stock phrases, flat vocabulary) so you can avoid it.</li>
        </ul>

        <h3>How it works and its limits</h3>
        <p>
          The detector looks at statistical patterns such as how much sentence length varies, how varied the vocabulary is, and
          how often common AI phrases appear. It produces a <strong>probability, not proof</strong>. No AI detector, ours or
          anyone else&apos;s, can tell with certainty who or what wrote a piece of text.
        </p>
        <ul>
          <li>
            <strong>False positives happen.</strong> Human writing can be flagged, especially very formal, technical or
            formulaic text, short passages, and writing by people using English as an additional language.
          </li>
          <li>
            <strong>False negatives happen.</strong> AI-written text that has been edited can score as human.
          </li>
          <li>Results can change as writing styles and AI models change.</li>
        </ul>

        <h3>Never use a score as the only evidence</h3>
        <p>
          Do not use a Lucenta score as the sole basis for accusing, grading, failing, disciplining, rejecting or firing anyone.
          If a result concerns you, look at other evidence (drafts, version history, notes, sources) and talk to the person.
          Treat the highlighted sentences as a reason to ask questions, not as an answer.
        </p>
      </>
    ),
  },
  {
    id: "rewriter",
    title: "The Rewriter",
    content: (
      <>
        <h3>Two modes</h3>
        <ul>
          <li>
            <strong>Suggestions</strong> points out sentences that are unclear, wordy, generic or repetitive and explains how
            to fix them. It never writes replacement sentences: you make the changes, so the writing stays yours. This is the
            only mode available on student accounts.
          </li>
          <li>
            <strong>Rewrite</strong> produces a clearer, more natural version of your text while keeping your meaning, names
            and numbers.
          </li>
        </ul>
        <h3>What it&apos;s for</h3>
        <p>Good uses include:</p>
        <ul>
          <li>Polishing your own drafts: emails, blog posts, product descriptions, social posts, reports and website copy.</li>
          <li>Making AI-assisted drafts sound like your brand or your voice, where using AI assistance is allowed.</li>
          <li>Helping people who write in a second language express their own ideas more fluently.</li>
          <li>Simplifying complex text so more people can understand it.</li>
          <li>Learning to spot and fix weak sentences in your own writing, with Suggestions mode.</li>
        </ul>

        <h3>What it&apos;s not for</h3>
        <ul>
          <li>
            <strong>Academic dishonesty:</strong> submitting AI-generated or rewritten work for assessment where your school,
            university, exam board or course doesn&apos;t allow it, or without the disclosure it requires.
          </li>
          <li>
            <strong>Hiding AI use where disclosure is required:</strong> for example by an employer, client contract, journal,
            competition, grant body, publisher or platform.
          </li>
          <li>
            <strong>Plagiarism:</strong> rewriting someone else&apos;s work so it can be passed off as your own or so it
            won&apos;t be recognised.
          </li>
          <li>
            <strong>Deceiving people at scale:</strong> fake reviews or testimonials, spam, impersonation, scams, fake news or
            other misinformation.
          </li>
        </ul>

        <h3>You remain the author</h3>
        <p>
          You are responsible for anything you publish or submit. Always read the output before using it, because rewrites can contain
          mistakes or shift nuance, even with our meaning check. Where AI assistance must be disclosed, disclose that you used
          the Rewriter. We deliberately don&apos;t show AI detection scores on rewritten text: the Rewriter is for clearer
          writing, not for passing detectors.
        </p>
      </>
    ),
  },
  {
    id: "students",
    title: "Students and educators",
    content: (
      <>
        <p>
          <strong>Students:</strong> your institution&apos;s academic integrity policy always applies. If you aren&apos;t sure
          whether AI tools are allowed on an assignment, ask your teacher or lecturer first. If they&apos;re allowed,
          disclose how you used them. To support academic integrity, student accounts can&apos;t use Rewrite mode. Instead,
          Suggestions mode shows you which sentences could be clearer and why, and you make the changes yourself. The AI
          Detector is a good way to check that your own writing doesn&apos;t read as generic before you hand it in.
        </p>
        <p>
          <strong>Educators:</strong> we encourage you to use the detector as one input among many. Because false positives
          affect some groups of writers more than others, please avoid making decisions from a score alone and give students a
          chance to explain their process.
        </p>
      </>
    ),
  },
  {
    id: "work-and-publishing",
    title: "Work, clients and publishing",
    content: (
      <p>
        Many employers, clients, publishers and platforms have rules about AI-generated content, and some laws and advertising
        codes require disclosure in certain situations (for example sponsored content or reviews). Check the rules that apply to
        you and follow them. Never use Lucenta to create fake reviews, endorsements or testimonials.
      </p>
    ),
  },
  {
    id: "what-we-do",
    title: "What we do on our side",
    content: (
      <ul>
        <li>We describe our tools honestly and don&apos;t advertise &quot;undetectable&quot; text or detector bypassing.</li>
        <li>Students get feedback (Suggestions mode) rather than rewritten text, and no AI score is shown on rewritten text.</li>
        <li>We show the reasons behind every detection score and explain its limits wherever the score appears.</li>
        <li>Daily limits keep the service from being used for mass-produced content.</li>
        <li>
          We may warn, limit, suspend or close accounts that break this policy or our <Link href="/terms">Terms of Use</Link>,
          and we may refuse service where we believe it&apos;s being used to deceive or harm others.
        </li>
      </ul>
    ),
  },
  {
    id: "report",
    title: "Reporting misuse",
    content: (
      <p>
        If you believe Lucenta is being used to cheat, deceive or harm people, email{" "}
        <a href={`mailto:${LEGAL_CONTACT}?subject=Misuse%20report`}>{LEGAL_CONTACT}</a> with as much detail as you can. We review
        every report.
      </p>
    ),
  },
];

export default function ResponsibleUsePage() {
  return (
    <LegalDocument
      current="/responsible-use"
      title="Responsible Use Policy"
      intro={
        <>
          <p>
            This policy explains how the AI Text Detector and Rewriter are meant to be used. It&apos;s written in plain
            language on purpose, because we want everyone to understand where we stand. It forms part of our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Use
            </Link>
            .
          </p>
          <p className="border-2 border-l-[6px] border-ink border-l-primary bg-primary/5 p-4">
            <strong>In short:</strong> use the Detector as a guide, never as proof. Use the Rewriter to improve writing
            you&apos;re allowed to improve, not to cheat, plagiarise or hide AI use where honesty is required.
          </p>
        </>
      }
      sections={sections}
    />
  );
}
