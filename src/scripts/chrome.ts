import { getLenis, scrollTo } from './lenis';
import { insideDark } from './hole-state';

/** Header behaviour (hide on scroll down, each item turns light once the dark reaches it) and the mobile menu. */
export function initChrome() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  const items = Array.from(header.querySelectorAll<HTMLElement>('[data-hdr]'));
  let lastY = window.scrollY;
  let menuOpen = false;

  /** Item by item: the dark spreads as a disc, so it reaches the header in pieces. */
  const tone = () => {
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.classList.toggle('on-dark', r.width > 0 && insideDark(r.left + r.width / 2, r.top + r.height / 2));
    });
  };

  const update = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) > 4) {
      header.classList.toggle('is-hidden', delta > 0 && y > 160 && !menuOpen);
      lastY = y;
    }
    tone();
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('holeupdate', tone);
  update();

  // In-page anchors (About, Experience, ...) glide instead of jumping.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return;
    const el = document.querySelector<HTMLElement>(url.hash);
    if (!el) return;
    e.preventDefault();
    scrollTo(el, { offset: -24, duration: 1.6 });
    window.history.pushState(null, '', url.hash);
  });

  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;

  const setMenu = (open: boolean) => {
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    header.classList.remove('is-hidden');
    const lenis = getLenis();
    if (lenis) open ? lenis.stop() : lenis.start();
  };

  toggle.addEventListener('click', () => setMenu(!menuOpen));
  menu.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => e.key === 'Escape' && menuOpen && setMenu(false));
}
