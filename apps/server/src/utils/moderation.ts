/**
 * Content Moderation Filter
 *
 * Lightweight profanity / toxicity checker using a built-in word list.
 * In production, swap with a ML model or external API (Perspective API, etc.).
 */

const PROFANITY_LIST = new Set([
  "fuck", "shit", "ass", "bitch", "damn", "cunt",
  "dick", "bastard", "slut", "whore", "nigger", "faggot",
  "retard", "kill yourself", "kys",
]);

// Build regex from word list (whole-word, case-insensitive)
const profanityRegex = new RegExp(
  `\\b(${[...PROFANITY_LIST].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi"
);

export interface ModerationResult {
  flagged: boolean;
  originalText: string;
  cleanText: string;
  matchedWords: string[];
}

/**
 * Check text for profanity. Returns a result with the cleaned version
 * where flagged words are replaced with asterisks.
 */
export function moderateText(text: string): ModerationResult {
  const matchedWords: string[] = [];

  const cleanText = text.replace(profanityRegex, (match) => {
    matchedWords.push(match.toLowerCase());
    return "*".repeat(match.length);
  });

  return {
    flagged: matchedWords.length > 0,
    originalText: text,
    cleanText,
    matchedWords: [...new Set(matchedWords)],
  };
}

/**
 * Quick boolean check – use for gate-keeping before persistence.
 */
export function isToxic(text: string): boolean {
  return profanityRegex.test(text);
}
