import { NextResponse } from "next/server";
import { listOutboxMessages } from "@/server/mail/mailer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found." } },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email") || undefined;
  const messages = listOutboxMessages(email);
  return NextResponse.json({ messages }, { status: 200 });
}
