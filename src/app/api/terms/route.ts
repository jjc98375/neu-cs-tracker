import { NextResponse } from "next/server";
import { getTerms } from "@/lib/banner-api";

export async function GET() {
  try {
    const terms = await getTerms(50);
    return NextResponse.json(terms);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
