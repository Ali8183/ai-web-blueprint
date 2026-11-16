import { NextResponse } from "next/server";
import { pingDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDb();
    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        db: "unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
