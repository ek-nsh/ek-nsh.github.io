// A tiny collectible meta-game: six hidden things to find. Progress is remembered in this
// browser only (localStorage), shown as six slots in the footer, and each find gets a toast.

const KEY = 'ek:discoveries:v1';

export const DISCOVERIES = [
  { id: 'supernova', name: 'Supernova', hint: 'Something in the hero is flammable.' },
  { id: 'comet', name: 'Comet', hint: 'Strays cross the sky when nobody is looking.' },
  { id: 'horizon', name: 'Event horizon', hint: 'Answer the pull at the very end.' },
  { id: 'nightowl', name: 'Night owl', hint: 'Visit after midnight.' },
  { id: 'peek', name: 'Peek-a-boo', hint: 'Look away, then come back.' },
  { id: 'lost', name: 'Lost in space', hint: 'Wander off the map.' },
] as const;

export type DiscoveryId = (typeof DISCOVERIES)[number]['id'];

const found = new Set<string>();
try {
  const saved = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
  if (Array.isArray(saved)) saved.forEach((id) => typeof id === 'string' && found.add(id));
} catch {
  /* private mode or blocked storage: progress just lasts for this visit */
}

const save = () => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    /* ignore */
  }
};

let toastTimer = 0;
function toast(text: string) {
  let el = document.querySelector<HTMLElement>('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast mono';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = text;
  // Restart the entrance animation.
  el.classList.remove('is-in');
  void el.offsetWidth;
  el.classList.add('is-in');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('is-in'), 3600);
}

function render() {
  const slots = document.querySelectorAll<HTMLElement>('[data-disc-slots] .slot');
  slots.forEach((s, i) => s.classList.toggle('is-found', found.has(DISCOVERIES[i].id)));
  const button = document.querySelector<HTMLElement>('[data-disc]');
  if (button) {
    const hints = DISCOVERIES.map((d) => (found.has(d.id) ? `✦ ${d.name}` : `? ${d.hint}`)).join('\n');
    button.setAttribute('title', hints);
    button.setAttribute('aria-label', `Discoveries: ${found.size} of ${DISCOVERIES.length} found`);
  }
}

/** Mark something as found (once). */
export function discover(id: DiscoveryId) {
  if (found.has(id)) return;
  found.add(id);
  save();
  render();
  const d = DISCOVERIES.find((x) => x.id === id)!;
  toast(`✦ Discovery ${found.size}/${DISCOVERIES.length}: ${d.name}`);
  if (found.size === DISCOVERIES.length) {
    window.setTimeout(() => {
      toast('✦ All six found. You looked closer than most.');
      window.dispatchEvent(new Event('discoveries:complete'));
    }, 3800);
  }
}

export function initDiscoveries() {
  const slots = document.querySelector('[data-disc-slots]');
  if (slots && !slots.children.length) {
    DISCOVERIES.forEach(() => {
      const s = document.createElement('i');
      s.className = 'slot';
      slots.appendChild(s);
    });
  }
  render();

  // Night owl: opening the site between midnight and 5 am, local time.
  if (new Date().getHours() < 5) window.setTimeout(() => discover('nightowl'), 3000);

  // Lost in space: the 404 page.
  if (document.querySelector('[data-lost]')) window.setTimeout(() => discover('lost'), 1600);
}
