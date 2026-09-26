import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: RouteContext<"/api/scans/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: scan } = await supabase.from("scans").select("*, scan_results(report)").eq("id", id).maybeSingle();
  if (!scan) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Scan not found." } }, { status: 404 });
  return NextResponse.json(scan);
}

export async function DELETE(_: Request, { params }: RouteContext<"/api/scans/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please log in." } }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("scans").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
