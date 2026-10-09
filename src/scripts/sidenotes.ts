/** Highlight a margin note and its reference together on hover or focus. */
export function initSidenotes() {
  document.querySelectorAll<HTMLElement>('.fn-ref').forEach((ref) => {
    const note = ref.parentElement?.nextElementSibling;
    if (!(note instanceof HTMLElement) || !note.classList.contains('sidenote')) return;

    const on = () => {
      ref.classList.add('is-active');
      note.classList.add('is-active');
    };
    const off = () => {
      ref.classList.remove('is-active');
      note.classList.remove('is-active');
    };

    [ref, note].forEach((el) => {
      el.addEventListener('mouseenter', on);
      el.addEventListener('mouseleave', off);
    });
    ref.addEventListener('focus', on);
    ref.addEventListener('blur', off);
  });
}
