// Turns Markdown footnotes into Tufte-style margin notes.
//
// Write normal footnotes ([^1]) in Markdown. For each reference this plugin inserts a
// <span class="sidenote"> right after it, containing a copy of the note. The original
// footnote list is left in place as the narrow-screen fallback; CSS decides which one
// is visible (see src/styles/post.css).

const REF_PREFIX = '#user-content-fn-';

/** Depth-first walk that gives the callback the node, its parent and its index. */
function walk(node, visit, parent = null, index = 0) {
  visit(node, parent, index);
  if (node.children) {
    // Iterate over a copy: visitors insert siblings.
    for (const [i, child] of [...node.children].entries()) {
      walk(child, visit, node, i);
    }
  }
}

function isBackref(node) {
  return node.type === 'element' && node.tagName === 'a' && node.properties && 'dataFootnoteBackref' in node.properties;
}

function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

export default function rehypeSidenotes() {
  return (tree) => {
    // 1. Collect footnote bodies (id -> inline children, minus the back-reference arrow).
    const notes = new Map();
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'li') return;
      const id = node.properties && node.properties.id;
      if (typeof id !== 'string' || !id.startsWith('user-content-fn-')) return;

      const inline = [];
      for (const child of node.children) {
        if (child.type === 'element' && child.tagName === 'p') {
          if (inline.length) inline.push({ type: 'text', value: ' ' });
          for (const grand of child.children) {
            if (!isBackref(grand)) inline.push(structuredClone(grand));
          }
        }
      }
      // Trim trailing whitespace left by the removed back-reference.
      const last = inline[inline.length - 1];
      if (last && last.type === 'text') last.value = last.value.replace(/\s+$/, '');
      notes.set(id, inline);
    });

    if (notes.size === 0) return;

    // 2. Insert a sidenote after each footnote reference.
    walk(tree, (node, parent, index) => {
      if (node.type !== 'element' || node.tagName !== 'sup' || !parent) return;
      const ref = (node.children || []).find(
        (c) => c.type === 'element' && c.tagName === 'a' && c.properties && 'dataFootnoteRef' in c.properties,
      );
      if (!ref) return;

      const href = String(ref.properties.href || '');
      if (!href.startsWith(REF_PREFIX)) return;
      const body = notes.get(href.slice(1));
      if (!body) return;

      const num = textOf(ref).trim();
      ref.properties.className = [...(ref.properties.className || []), 'fn-ref'];
      ref.properties['dataSn'] = num;

      const sidenote = {
        type: 'element',
        tagName: 'span',
        properties: { className: ['sidenote'], dataSn: num },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['sidenote-num'] },
            children: [{ type: 'text', value: num }],
          },
          ...structuredClone(body),
        ],
      };

      // `index` was captured before earlier insertions into this parent, so find the sup again.
      const at = parent.children.indexOf(node);
      parent.children.splice(at + 1, 0, sidenote);
    });
  };
}
