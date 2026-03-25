/**
 * Selective Unicode ligature decomposition for epub-to-markdown conversion.
 *
 * Decomposes only the Latin typographic ligatures (U+FB00–FB06) that are
 * commonly embedded in epub/PDF content:
 *
 *   U+FB00 ﬀ → ff
 *   U+FB01 ﬁ → fi
 *   U+FB02 ﬂ → fl
 *   U+FB03 ﬃ → ffi
 *   U+FB04 ﬄ → ffl
 *   U+FB05 ﬅ → st  (long-s t)
 *   U+FB06 ﬆ → st
 *
 * Unlike blanket NFKC normalization, this approach does NOT alter:
 *   - CJK fullwidth punctuation (，：？！（） etc.)
 *   - Circled/enclosed characters (① ② ③ etc.)
 *   - Superscript/subscript digits (² ³ etc.)
 *   - Other compatibility mappings
 *
 * This runs AFTER the HTML-to-Markdown conversion step so that structural
 * Markdown syntax (headings, links, images) is already in place and only
 * the text content is affected.
 *
 * No external dependencies — pure string replacement.
 */

/** Mapping of Latin ligature codepoints to their decomposed ASCII forms. */
const LIGATURE_MAP: Record<string, string> = {
  '\uFB00': 'ff',   // ﬀ
  '\uFB01': 'fi',   // ﬁ
  '\uFB02': 'fl',   // ﬂ
  '\uFB03': 'ffi',  // ﬃ
  '\uFB04': 'ffl',  // ﬄ
  '\uFB05': 'st',   // ﬅ (long s t)
  '\uFB06': 'st',   // ﬆ
}

/** Regex matching any Latin ligature in U+FB00–FB06. */
const LIGATURE_RE = /[\uFB00-\uFB06]/g

/**
 * Decompose Latin typographic ligatures to their ASCII equivalents.
 *
 * @param text - Markdown text that may contain ligature codepoints
 * @returns Text with ligatures replaced by their component letters
 */
export function normalizeUnicode(text: string): string {
  if (!text) return text
  return text.replace(LIGATURE_RE, (ch) => LIGATURE_MAP[ch] ?? ch)
}
