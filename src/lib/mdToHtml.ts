// Minimal, dependency-free Markdown → HTML for inserting AI output (describe/rewrite)
// into the TipTap description. Covers the common cases the model emits: headings, bullet
// and numbered lists, bold/italic/code, and paragraphs. Text is HTML-escaped FIRST, so
// model output can never inject arbitrary markup — only the tags we emit below appear.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Inline: **bold**, *italic* / _italic_, `code`. Applied after escaping.
function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const escaped = inline(escapeHtml(line.trim()));

    if (line.trim() === "") {
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(escapeHtml(heading[2].trim()))}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!list || list.tag !== "ul") {
        flushList();
        list = { tag: "ul", items: [] };
      }
      list.items.push(inline(escapeHtml(bullet[1].trim())));
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (!list || list.tag !== "ol") {
        flushList();
        list = { tag: "ol", items: [] };
      }
      list.items.push(inline(escapeHtml(ordered[1].trim())));
      continue;
    }

    flushList();
    out.push(`<p>${escaped}</p>`);
  }
  flushList();

  return out.join("");
}
