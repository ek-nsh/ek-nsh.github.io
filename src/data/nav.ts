// The site's pages, in header order. `match` is the path prefix that marks a link as current.

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const nav = [
  { href: `${base}/#about`, label: 'About', match: '' },
  { href: `${base}/trajectory`, label: 'Trajectory', match: '/trajectory' },
  { href: `${base}/work`, label: 'Work', match: '/work' },
  { href: `${base}/research`, label: 'Research', match: '/research' },
  { href: `${base}/writing`, label: 'Writing', match: '/writing' },
  { href: `${base}/lab`, label: 'Lab', match: '/lab' },
];

/** Is this nav item the page we are on? About is never "current" (it is an anchor on the home page). */
export function isCurrent(match: string, pathname: string) {
  if (!match) return false;
  const path = pathname.replace(base, '').replace(/\/$/, '') || '/';
  return path === match || path.startsWith(`${match}/`);
}
