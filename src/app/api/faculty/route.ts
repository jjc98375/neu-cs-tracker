import { NextResponse } from "next/server";
import { getFacultyMeetingTimes } from "@/lib/banner-api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crn = searchParams.get("crn");
  const term = searchParams.get("term");

  if (!crn || !term) {
    return NextResponse.json({ error: "crn and term are required" }, { status: 400 });
  }

  try {
    const faculty = await getFacultyMeetingTimes(crn, term);
    return NextResponse.json({ faculty });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
