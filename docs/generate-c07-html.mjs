import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL(
  "../frontend/src/features/docs/c07/cs.json",
  import.meta.url,
);
const outputUrl = new URL("./C07_Complete_Assignment.html", import.meta.url);
const document = JSON.parse(await readFile(sourceUrl, "utf8"));

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const inline = (value) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const renderBlock = (block) => {
  if (block.type === "paragraph") return `<p>${inline(block.content)}</p>`;
  if (block.type === "note")
    return `<aside class="note note-${escapeHtml(block.variant)}">${inline(block.content)}</aside>`;
  if (block.type === "table") {
    const header = block.headers
      .map((cell) => `<th scope="col">${inline(cell)}</th>`)
      .join("");
    const rows = block.rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell, index) =>
                `<td data-label="${escapeHtml(block.headers[index])}">${inline(cell)}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    return `<div class="table-wrap"><table class="columns-${block.headers.length}"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  return "";
};

const navigation = document.sections
  .map(
    (section) =>
      `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`,
  )
  .join("");
const sections = document.sections
  .map(
    (section) =>
      `<section id="${escapeHtml(section.id)}"><h2>${escapeHtml(section.title)}</h2>${section.blocks.map(renderBlock).join("\n")}</section>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(document.title)}</title>
    <style>
      :root { color-scheme: light; --ink: #172334; --blue: #2455b5; --teal: #0f766e; --line: #d4deeb; --wash: #f3f6fa; }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; background: var(--wash); color: var(--ink); font: 16px/1.6 "Segoe UI", Arial, sans-serif; }
      nav { position: sticky; top: 0; z-index: 3; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; padding: 12px; background: #0f274b; }
      nav a { color: white; text-decoration: none; padding: 6px 10px; border-radius: 7px; }
      nav a:hover, nav a:focus-visible { background: #24446f; }
      main { width: min(1180px, calc(100% - 32px)); margin: 28px auto 64px; }
      header, section { background: white; border: 1px solid var(--line); border-radius: 14px; padding: clamp(18px, 3vw, 30px); margin-bottom: 18px; box-shadow: 0 6px 22px #1723340a; }
      h1, h2 { line-height: 1.25; margin: 0 0 16px; }
      h1 { color: var(--blue); font-size: clamp(1.65rem, 4vw, 2.3rem); }
      h2 { color: var(--teal); font-size: clamp(1.25rem, 3vw, 1.6rem); }
      p { margin: 12px 0; }
      .table-wrap { width: 100%; overflow-x: auto; margin: 14px 0 22px; }
      table { width: 100%; table-layout: fixed; border-collapse: collapse; }
      th, td { padding: 10px 12px; border: 1px solid var(--line); vertical-align: top; text-align: left; overflow-wrap: anywhere; }
      th { background: #edf3fb; color: #17335c; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      table.columns-2 th:first-child, table.columns-2 td:first-child { width: 30%; }
      table.columns-3 th:first-child, table.columns-3 td:first-child { width: 21%; }
      table.columns-3 th:nth-child(2), table.columns-3 td:nth-child(2) { width: 40%; }
      table.columns-4 th:first-child, table.columns-4 td:first-child { width: 20%; }
      table.columns-4 th:nth-child(2), table.columns-4 td:nth-child(2) { width: 28%; }
      table.columns-5 th:first-child, table.columns-5 td:first-child { width: 23%; }
      .note { border-left: 4px solid var(--blue); background: #eff6ff; padding: 12px 15px; border-radius: 6px; margin: 14px 0; }
      .note-warning { border-color: #c47a00; background: #fff8e8; }
      code { overflow-wrap: anywhere; }
      @media (max-width: 720px) {
        main { width: min(100% - 20px, 620px); margin-top: 14px; }
        nav { position: static; justify-content: flex-start; }
        nav a { font-size: .9rem; }
        header, section { padding: 16px; border-radius: 11px; }
        .table-wrap { overflow: visible; }
        table, tbody, tr, td { display: block; width: 100% !important; }
        thead { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
        tbody tr { margin: 12px 0; border: 1px solid var(--line); border-radius: 9px; overflow: hidden; background: white; }
        td { display: grid; grid-template-columns: minmax(105px, 34%) minmax(0, 1fr); gap: 10px; border: 0; border-bottom: 1px solid var(--line); padding: 9px 10px; }
        td:last-child { border-bottom: 0; }
        td::before { content: attr(data-label); font-weight: 700; color: #17335c; }
      }
    </style>
  </head>
  <body>
    <nav aria-label="Navigace v dokumentaci">${navigation}</nav>
    <main>
      <header><h1>${escapeHtml(document.title)}</h1><p>Projektové podklady a ověřené výstupy pro Consultation Reservation.</p></header>
      ${sections}
    </main>
  </body>
</html>
`;

await writeFile(outputUrl, html, "utf8");
