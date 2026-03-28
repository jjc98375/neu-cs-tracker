import { NextResponse } from "next/server";
import { searchCourses } from "@/lib/banner-api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get("term");
  if (!term) {
    return NextResponse.json({ error: "term is required" }, { status: 400 });
  }

  try {
    const result = await searchCourses({
      term,
      subject: searchParams.get("subject") ?? undefined,
      courseNumber: searchParams.get("courseNumber") ?? undefined,
      campus: searchParams.get("campus") ?? undefined,
      pageOffset: parseInt(searchParams.get("pageOffset") ?? "0", 10),
      pageMaxSize: parseInt(searchParams.get("pageMaxSize") ?? "500", 10),
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
