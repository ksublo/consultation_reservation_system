export type DocumentationBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] }
  | { type: 'code'; language?: string; content: string }
  | { type: 'note'; variant: 'info' | 'warning'; content: string }
  | {
      type: 'image'
      src: string
      alt: string
      caption?: string
      fullWidth?: boolean
    }
  | { type: 'checklist'; items: { label: string; done: boolean }[] }

export type DocumentationSection = {
  id: string
  title: string
  blocks: DocumentationBlock[]
}

export type Documentation = {
  title: string
  sections: DocumentationSection[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function assertBlock(value: unknown, location: string): asserts value is DocumentationBlock {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new Error(`${location}: documentation block must have a type`)
  }

  switch (value.type) {
    case 'paragraph':
    case 'code':
    case 'note':
      if (typeof value.content !== 'string') {
        throw new Error(`${location}: ${value.type} block must have string content`)
      }
      if (
        value.type === 'code' &&
        value.language !== undefined &&
        typeof value.language !== 'string'
      ) {
        throw new Error(`${location}: code language must be a string`)
      }
      if (value.type === 'note' && value.variant !== 'info' && value.variant !== 'warning') {
        throw new Error(`${location}: note variant must be info or warning`)
      }
      return
    case 'table':
      if (!isStringArray(value.headers) || !Array.isArray(value.rows)) {
        throw new Error(`${location}: table needs string headers and rows`)
      }
      {
        const headers = value.headers
        value.rows.forEach((row, rowIndex) => {
          if (!isStringArray(row) || row.length !== headers.length) {
            throw new Error(`${location}: table row ${rowIndex + 1} does not match its headers`)
          }
        })
      }
      return
    case 'list':
      if (!isStringArray(value.items)) {
        throw new Error(`${location}: list items must be strings`)
      }
      return
    case 'image':
      if (
        typeof value.src !== 'string' ||
        typeof value.alt !== 'string' ||
        (value.caption !== undefined && typeof value.caption !== 'string') ||
        (value.fullWidth !== undefined && typeof value.fullWidth !== 'boolean')
      ) {
        throw new Error(`${location}: image block has invalid fields`)
      }
      return
    case 'checklist':
      if (
        !Array.isArray(value.items) ||
        !value.items.every(
          (item) =>
            isRecord(item) && typeof item.label === 'string' && typeof item.done === 'boolean',
        )
      ) {
        throw new Error(`${location}: checklist items need a label and done flag`)
      }
      return
    default:
      throw new Error(`${location}: unsupported documentation block type "${value.type}"`)
  }
}

export function parseDocumentation(value: unknown, source: string): Documentation {
  if (!isRecord(value) || typeof value.title !== 'string' || !Array.isArray(value.sections)) {
    throw new Error(`${source}: document needs a title and sections`)
  }

  value.sections.forEach((section, sectionIndex) => {
    const location = `${source}, section ${sectionIndex + 1}`
    if (
      !isRecord(section) ||
      typeof section.id !== 'string' ||
      typeof section.title !== 'string' ||
      !Array.isArray(section.blocks)
    ) {
      throw new Error(`${location}: section needs an id, title and blocks`)
    }
    section.blocks.forEach((block, blockIndex) => {
      assertBlock(block, `${location}, block ${blockIndex + 1}`)
    })
  })

  return value as unknown as Documentation
}
