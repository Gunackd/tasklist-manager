import { TaskCategory, ALL_CATEGORIES } from '../types/index.js';

/**
 * Parses raw multi-line text input into clean individual task titles.
 */
export function parseBulkTasks(text: string): string[] {
  if (!text) return [];

  return text
    .split(/\r?\n/)
    .map((line) => {
      let cleaned = line.trim();

      // Check for inline bracketed categories
      cleaned = cleaned.replace(/^\[[A-Za-z,\s]+\]\s*/, '');
      cleaned = cleaned.replace(/^\([A-Za-z,\s]+\)\s*/, '');

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

export function parseBulkTasksWithCategories(
  text: string,
  defaultCategories: TaskCategory[] = ['S']
): { title: string; categories: TaskCategory[]; category: TaskCategory }[] {
  if (!text) return [];

  return text
    .split(/\r?\n/)
    .map((line) => {
      let cleaned = line.trim();
      let categories: TaskCategory[] = [...defaultCategories];

      // Extract inline bracketed categories like [S, NS], [M, A], [S][M]
      const bracketMatch = cleaned.match(/^\[([A-Za-z,\s]+)\]\s*/i);
      if (bracketMatch) {
        const found = bracketMatch[1]
          .split(/[,\s]+/)
          .map(s => s.trim().toUpperCase())
          .filter((c: any) => ALL_CATEGORIES.includes(c as TaskCategory)) as TaskCategory[];
        if (found.length > 0) {
          categories = found;
          cleaned = cleaned.slice(bracketMatch[0].length).trim();
        }
      }

      // Remove markdown checkboxes like [ ], [x], [X]
      cleaned = cleaned.replace(/^\[[ xX]\]\s*/, '');

      // Remove checkmark / circle bullet symbols
      cleaned = cleaned.replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '');

      // Remove numbered prefixes like "1. ", "1) ", "(1) ", "1: ", "1 - "
      cleaned = cleaned.replace(/^\(?\d+[\.\)\:\-]\s*/, '');

      // Secondary check if checkmarks or bullets were after numbering
      cleaned = cleaned.replace(/^[✓✔○●\-\*\+•›»\>]\s*/, '');

      // Check again if categories were after numbering e.g. "1. [S, A] Practice"
      const secondBracket = cleaned.match(/^\[([A-Za-z,\s]+)\]\s*/i);
      if (secondBracket) {
        const found = secondBracket[1]
          .split(/[,\s]+/)
          .map(s => s.trim().toUpperCase())
          .filter((c: any) => ALL_CATEGORIES.includes(c as TaskCategory)) as TaskCategory[];
        if (found.length > 0) {
          categories = found;
          cleaned = cleaned.slice(secondBracket[0].length).trim();
        }
      }

      return {
        title: cleaned.trim(),
        categories,
        category: categories[0] || 'S',
      };
    })
    .filter((item) => item.title.length > 0);
}

// Backward compatibility alias
export function parseBulkTasksWithCategory(
  text: string,
  defaultCategory: TaskCategory = 'S'
): { title: string; category: TaskCategory }[] {
  return parseBulkTasksWithCategories(text, [defaultCategory]).map(t => ({
    title: t.title,
    category: t.category,
  }));
}
