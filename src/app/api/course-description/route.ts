import { NextResponse } from "next/server";
import { getCourseDescription } from "@/lib/banner-api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crn = searchParams.get("crn");
  const term = searchParams.get("term");
  const subject = searchParams.get("subject") ?? undefined;
  const courseNumber = searchParams.get("courseNumber") ?? undefined;

  if (!crn || !term) {
    return NextResponse.json({ error: "crn and term are required" }, { status: 400 });
  }

  try {
    const description = await getCourseDescription(crn, term, subject, courseNumber);
    return NextResponse.json({ description });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
