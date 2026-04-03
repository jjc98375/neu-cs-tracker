import { NextResponse } from "next/server";
import { bannerGetSubjects } from "@/lib/banner-api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term");
  if (!term) {
    return NextResponse.json({ error: "term is required" }, { status: 400 });
  }
  try {
    const data = await bannerGetSubjects(term);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
