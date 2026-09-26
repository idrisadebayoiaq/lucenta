import type { Metadata } from "next";
import { DeveloperCard } from "@/components/developer-card";
import { getDevelopers } from "@/lib/developers";

export const metadata: Metadata = {
  title: "Hire a developer",
  description: "Get an experienced developer to fix the issues in your Lucenta website report.",
};

export const revalidate = 3600;

export default async function DevelopersPage() {
  const developers = await getDevelopers();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Hire a developer</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Ran a Lucenta audit and don&apos;t want to fix everything yourself? These developers can take your report and handle the
          speed, SEO, security, accessibility and design fixes for you.
        </p>
      </div>
      <div className="space-y-6">
        {developers.length ? (
          developers.map((dev) => <DeveloperCard key={dev.id} dev={dev} />)
        ) : (
          <p className="text-muted-foreground">No developers are available right now. Please check back soon.</p>
        )}
      </div>
    </div>
  );
}
