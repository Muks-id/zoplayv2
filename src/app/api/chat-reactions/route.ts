import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { CHAT_REACTION_EMOJIS } from "@/lib/chat-emojis";
import { isRecord } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serviceClient() {
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

/** Toggle reaction pada pesan: kalau sudah ada dihapus, kalau belum ditambahkan. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Harus login dulu." }, { status: 401 });

  let messageId: unknown;
  let emoji: unknown;
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) return Response.json({ error: "Body tidak valid." }, { status: 400 });
    messageId = body?.messageId;
    emoji = body?.emoji;
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (typeof messageId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)) {
    return Response.json({ error: "messageId tidak valid." }, { status: 400 });
  }
  if (typeof emoji !== "string" || !(CHAT_REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return Response.json({ error: "Emoji tidak didukung." }, { status: 400 });
  }

  const client = serviceClient();
  if (!client) return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 500 });

  const { data: target } = await client.from("public_chat").select("id").eq("id", messageId).maybeSingle();
  if (!target) return Response.json({ error: "Pesan tidak ditemukan." }, { status: 404 });

  const { data: existing } = await client
    .from("chat_reactions")
    .select("message_id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await client.from("chat_reactions").delete().eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji);
    return Response.json({ active: false, emoji });
  }

  const { error } = await client.from("chat_reactions").insert({ message_id: messageId, user_id: userId, emoji });
  if (error) return Response.json({ error: "Gagal menyimpan reaction." }, { status: 500 });
  return Response.json({ active: true, emoji });
}
