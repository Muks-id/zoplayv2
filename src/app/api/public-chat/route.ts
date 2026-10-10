import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isRecord } from "@/lib/utils";
import type { ChatReaction } from "@/lib/chat-emojis";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Klien service-role: hanya dipakai di server, setelah sesi Clerk diverifikasi.
function serviceClient() {
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  const client = serviceClient();
  if (!client) return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 500 });

  const { data, error } = await client
    .from("public_chat")
    .select("id, user_id, username, message, reply_to_id, created_at")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return Response.json({ error: "Gagal memuat chat." }, { status: 500 });

  const messages = data ?? [];
  const messageIds = messages.map((m) => m.id);

  const reactionsByMessage = new Map<string, ChatReaction[]>();
  if (messageIds.length) {
    const { userId } = await auth();
    const { data: reactions } = await client
      .from("chat_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);

    const grouped = new Map<string, Map<string, { count: number; mine: boolean }>>();
    for (const row of (reactions ?? []) as { message_id: string; emoji: string; user_id: string }[]) {
      const perEmoji = grouped.get(row.message_id) ?? new Map<string, { count: number; mine: boolean }>();
      const entry = perEmoji.get(row.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (row.user_id === userId) entry.mine = true;
      perEmoji.set(row.emoji, entry);
      grouped.set(row.message_id, perEmoji);
    }

    for (const [messageId, perEmoji] of grouped) {
      reactionsByMessage.set(
        messageId,
        [...perEmoji.entries()].map(([emoji, info]) => ({ emoji, count: info.count, reactedByMe: info.mine })),
      );
    }
  }

  const withReactions = messages.map((m) => ({ ...m, reactions: reactionsByMessage.get(m.id) ?? [] }));
  return Response.json({ messages: withReactions });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Harus login dulu." }, { status: 401 });

  const user = await currentUser();
  const name =
    user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "Anonim";

  let message: unknown;
  let replyToId: unknown;
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) return Response.json({ error: "Body tidak valid." }, { status: 400 });
    message = body?.message;
    replyToId = body?.replyToId;
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
  }

  // Validasi reply: harus UUID milik pesan yang benar-benar ada.
  let validReplyToId: string | null = null;
  if (typeof replyToId === "string" && replyToId.trim()) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replyToId)) {
      return Response.json({ error: "replyToId tidak valid." }, { status: 400 });
    }
    const client = serviceClient();
    if (!client) return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 500 });
    const { data: target } = await client
      .from("public_chat")
      .select("id")
      .eq("id", replyToId)
      .maybeSingle();
    if (!target) {
      return Response.json({ error: "Pesan yang dibalas tidak ditemukan." }, { status: 400 });
    }
    validReplyToId = replyToId;
  }

  const client = serviceClient();
  if (!client) return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 500 });

  const { data, error } = await client
    .from("public_chat")
    .insert({
      user_id: userId,
      username: name,
      message: message.trim().slice(0, 500),
      reply_to_id: validReplyToId,
    })
    .select("id, user_id, username, message, reply_to_id, created_at")
    .single();

  if (error) {
    console.error("Public chat insert error:", error);
    return Response.json({ error: "Gagal mengirim pesan. Coba lagi." }, { status: 500 });
  }

  return Response.json({ message: data });
}
