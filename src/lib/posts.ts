import { getCollection } from 'astro:content';

const WORDS_PER_MINUTE = 220;

/** The first margin note of a post, as plain text: a taste of the sidenotes, shown on hover. */
function firstNote(body: string) {
  const m = /^\[\^1\]:\s*(.+)$/m.exec(body);
  if (!m) return null;
  const text = m[1]
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
  return text.length > 130 ? `${text.slice(0, 127).trimEnd()}…` : text;
}

export async function getPosts() {
  const entries = await getCollection('writing');
  return entries
    .map((entry) => ({
      entry,
      minutes: Math.max(1, Math.round((entry.body ?? '').split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE)),
      peek: firstNote(entry.body ?? ''),
    }))
    .sort((a, b) => b.entry.data.date.valueOf() - a.entry.data.date.valueOf());
}

export type PostItem = Awaited<ReturnType<typeof getPosts>>[number];

/** Dates are stored as UTC midnight, so format in UTC to avoid off-by-one days. */
export function formatDate(date: Date, long = false) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
