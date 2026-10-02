import { TaskCategory } from '../types/index.js';

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

      // Check for inline category prefix like [S], [NS], [M]
      cleaned = cleaned.replace(/^\[(S|NS|M)\]\s*/i, '');
      cleaned = cleaned.replace(/^\((S|NS|M)\)\s*/i, '');
      cleaned = cleaned.replace(/^(S|NS|M):\s*/i, '');

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

export function parseBulkTasksWithCategory(
  text: string,
  defaultCategory: TaskCategory = 'S'
): { title: string; category: TaskCategory }[] {
  if (!text) return [];

  return text
    .split(/\r?\n/)
    .map((line) => {
      let cleaned = line.trim();
      let category: TaskCategory = defaultCategory;

      // Extract inline category if present: [S], [NS], [M] or (S), (NS), (M) or S:, NS:, M:
      const catMatch = cleaned.match(/^\[(S|NS|M)\]\s*/i) ||
                        cleaned.match(/^\((S|NS|M)\)\s*/i) ||
                        cleaned.match(/^(S|NS|M):\s*/i);
      if (catMatch) {
        category = catMatch[1].toUpperCase() as TaskCategory;
        cleaned = cleaned.slice(catMatch[0].length).trim();
      }

      // Remove markdown checkboxes like [ ], [x], [X]
      cleaned = cleaned.replace(/^\[[ xX]\]\s*/, '');

      // Remove checkmark / circle bullet symbols
      cleaned = cleaned.replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '');

      // Remove numbered prefixes like "1. ", "1) ", "(1) ", "1: ", "1 - "
      cleaned = cleaned.replace(/^\(?\d+[\.\)\:\-]\s*/, '');

      // Secondary check if checkmarks or bullets were after numbering
      cleaned = cleaned.replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '');

      // Check again if category was after numbering e.g. "1. [M] Practice"
      const secondCatMatch = cleaned.match(/^\[(S|NS|M)\]\s*/i) ||
                             cleaned.match(/^\((S|NS|M)\)\s*/i) ||
                             cleaned.match(/^(S|NS|M):\s*/i);
      if (secondCatMatch) {
        category = secondCatMatch[1].toUpperCase() as TaskCategory;
        cleaned = cleaned.slice(secondCatMatch[0].length).trim();
      }

      return {
        title: cleaned.trim(),
        category,
      };
    })
    .filter((item) => item.title.length > 0);
}
