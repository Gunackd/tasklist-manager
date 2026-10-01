/**
 * Parses raw multi-line text input into clean individual task titles.
 * Automatically removes:
 * - Numbering prefix: e.g. "1. ", "1) ", "(1) ", "1 - "
 * - Bullets: e.g. "- ", "* ", "• ", "+ ", "> "
 * - Checkbox markers: e.g. "[ ] ", "[x] ", "[X] ", "✓ ", "○ "
 * - Trims whitespace and ignores empty lines.
 */
export function parseBulkTasks(text: string): string[] {
  if (!text) return [];

  return text
    .split(/\r?\n/)
    .map((line) => {
      let cleaned = line.trim();

      // Remove markdown checkboxes like [ ], [x], [X]
      cleaned = cleaned.replace(/^\[[ xX]\]\s*/, '');

      // Remove checkmark / circle bullet symbols
      cleaned = cleaned.replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '');

      // Remove numbered prefixes like "1. ", "1) ", "(1) ", "1: ", "1 - "
      cleaned = cleaned.replace(/^\(?\d+[\.\)\:\-]\s*/, '');

      // Secondary check if checkmarks or bullets were after numbering
      cleaned = cleaned.replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '');

      return cleaned.trim();
    })
    .filter((line) => line.length > 0);
}
