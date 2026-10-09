/** The reading rail on a post: marks sections you have passed and the one you are in. */
export function initRail() {
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  if (!rail) return;

  const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>('[data-rail-link]'));
  const heads = links.map((l) => document.getElementById(l.dataset.slug ?? ''));
  let ticking = false;

  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.34;
    let active = -1;
    heads.forEach((h, i) => {
      if (h && h.getBoundingClientRect().top < line) active = i;
    });
    links.forEach((l, i) => {
      l.classList.toggle('is-active', i === active);
      l.classList.toggle('is-passed', i < active);
    });
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  window.addEventListener('resize', update);
  update();
}
