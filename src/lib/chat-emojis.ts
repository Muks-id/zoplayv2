/** Emoji yang boleh dipakai sebagai reaction pada pesan chat. */
export const CHAT_REACTION_EMOJIS = ["😂", "😍", "🔥", "👏", "❤️", "😮", "😭", "🎮", "👍"] as const;

/** Emoji lucu yang bisa disisipkan ke pesan. */
export const CHAT_MESSAGE_EMOJIS = [
  "😂", "🤣", "😍", "🥰", "😎", "🥳", "😭", "😱",
  "🔥", "🎮", "👍", "👏", "❤️", "💀", "🤡", "🤔",
] as const;

export type ChatReaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};
