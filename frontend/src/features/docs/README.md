# Documentation content

Each documentation part has its own folder and the same JSON shape for Czech
and English:

```text
docs/
  c01/cs.json
  c01/en.json
  c02/cs.json
  c02/en.json
  c03a/cs.json
  c03a/en.json
  c03b/cs.json
  c03b/en.json
  c05/cs.json
  c05/en.json
  c07/cs.json
  c07/en.json
  c08/cs.json
  c08/en.json
```

Every file contains one document with `title` and `sections`. Each section has
an `id`, a `title` and a list of typed `blocks`. Use the existing block types:
`paragraph`, `list`, `table`, `code`, `note`, `image` and `checklist`. Tables
must have the same number of cells in every row as they have headers.

`documentation-model.ts` defines and validates this shared structure when the
app loads. `DocumentationPage.tsx` is the single renderer for every part and
both languages, so content files do not define their own visual styles.

When adding another part, create matching `cs.json` and `en.json` files with
the same structure, then add the part to `DocsSection`, `tabs`, imports and the
`documents` map in `DocumentationPage.tsx`. Format the files with
`npm run format` from `frontend/`.

C05 copies the design and verification sections from `docs/architecture-and-decisions.md`
and `docs/evidence-and-evolution.md`. Keep the Czech copy and English translation
in sync when those source sections change. Sequence diagram source is in
`docs/diagrams/c05-approval-sequence.svg`; its bundled copy is in
`frontend/src/assets/docs/`.

C07's complete assignment and filled project tables are in
`frontend/src/features/docs/c07/`. Regenerate the responsive standalone page
with `node docs/generate-c07-html.mjs`; its output is
`docs/C07_Complete_Assignment.html`.

C08 documents automatic cancellation of unapproved reservations. Its paired
files summarize the same CR, baseline, impact matrix, alternatives, decision,
verification evidence, and open follow-up as the project records. Keep results
separated by revision; do not mark a BLOCKED baseline case or unverified PR
review as complete.
