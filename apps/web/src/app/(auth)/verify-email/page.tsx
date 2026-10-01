import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  if (!email) redirect("/signup");

  return (
    <div>
      <div className="mb-5 grid h-12 w-12 place-items-center border-2 border-ink bg-primary text-white shadow-brutal-xs">
        <MailCheck className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {params.resent ? "Your email isn't confirmed yet, so we sent a new code to " : "We sent a verification code to "}
        <span className="font-semibold text-foreground">{email}</span>. Enter it below to activate your account.
      </p>
      <div className="mt-5">
        <Alert tone="warning" title="Can't find the email?">
          It can take a minute to arrive. Check your <strong className="text-foreground">Spam</strong> or{" "}
          <strong className="text-foreground">Promotions</strong> folder for an email from Lucenta. If it&apos;s there, mark it as
          &ldquo;Not spam&rdquo; so future emails reach your inbox.
        </Alert>
      </div>
      <div className="mt-6">
        <VerifyForm email={email} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up again
        </Link>
      </p>
    </div>
  );
}
