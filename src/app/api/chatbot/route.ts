import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBookingBase } from "@/lib/expert-api";

// The AI agent can call several tools (Supabase, Calendar), so allow some time
export const maxDuration = 60;

// Webhook id of the "Chat Trigger" node in the n8n assistant workflow
const CHAT_WEBHOOK_ID = "699edee0-1cb5-4d5d-8faf-f9ebd50a3c0c";

function getChatUrl() {
  const explicit = process.env.N8N_CHATBOT_WEBHOOK_URL?.trim();
  if (explicit) return explicit;

  // The assistant lives on the same n8n instance as the booking workflow
  const base = getBookingBase();
  return base ? `${base}/webhook/${CHAT_WEBHOOK_ID}/chat` : null;
}

/** Lets the chat widget know whether a customer is signed in */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ signedIn: false }, { status: 401 });
  }

  return NextResponse.json({ signedIn: true });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // The customer identity ALWAYS comes from the server session.
  // It is never taken from the browser, so nobody can chat as someone else.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to chat with the assistant." },
      { status: 401 }
    );
  }

  let message = "";
  try {
    const body = await request.json();
    message = typeof body.message === "string" ? body.message.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is empty." }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Your message is too long. Please shorten it." },
      { status: 400 }
    );
  }

  const url = getChatUrl();
  if (!url) {
    return NextResponse.json(
      { error: "The assistant is not configured yet." },
      { status: 500 }
    );
  }

  // Optional: if Basic Auth is enabled on the n8n Chat Trigger
  const user_ = process.env.N8N_CHATBOT_USER?.trim();
  const pass_ = process.env.N8N_CHATBOT_PASSWORD?.trim();
  const authHeader =
    user_ && pass_
      ? {
          Authorization: `Basic ${Buffer.from(`${user_}:${pass_}`).toString("base64")}`,
        }
      : {};

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        action: "sendMessage",
        sessionId: user.id,
        chatInput: message,
        metadata: { userId: user.id, email: user.email ?? "" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });

    if (!response.ok) {
      throw new Error(`Assistant returned HTTP ${response.status}.`);
    }

    const raw = await response.json();
    const data = Array.isArray(raw) ? raw[0] : raw;
    const reply: unknown = data?.output ?? data?.text ?? data?.message;

    if (typeof reply !== "string" || reply.trim().length === 0) {
      throw new Error("The assistant returned an empty reply.");
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    console.error("Chatbot error:", error);

    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 }
    );
  }
}
