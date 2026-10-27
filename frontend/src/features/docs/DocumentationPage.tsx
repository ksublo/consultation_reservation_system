import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language, TFunction } from '../../i18n'
import csC01 from './c01/cs.json'
import csC02 from './c02/cs.json'
import csC03A from './c03a/cs.json'
import csC03B from './c03b/cs.json'
import csC05 from './c05/cs.json'
import enC01 from './c01/en.json'
import enC02 from './c02/en.json'
import enC03A from './c03a/en.json'
import enC03B from './c03b/en.json'
import enC05 from './c05/en.json'
import c06Source from './c06/C06_Assessment_consultation_reservation_system.md?raw'
import {
  parseDocumentation,
  type Documentation,
  type DocumentationBlock,
} from './documentation-model'

type DocsSection = 'c01' | 'c02' | 'c03a' | 'c03b' | 'c05' | 'c06'
type StructuredDocsSection = Exclude<DocsSection, 'c06'>

interface DocumentationPageProps {
  language: Language
  t: TFunction
}

const tabs: DocsSection[] = ['c01', 'c02', 'c03a', 'c03b', 'c05', 'c06']
const bundledImages = import.meta.glob('../../assets/docs/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function imageUrl(src: string) {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src
  return bundledImages['../../assets/docs/' + src] ?? src
}

function Diagram({
  src,
  alt,
  caption,
  fullWidth,
  initialWidth,
  language,
}: Extract<DocumentationBlock, { type: 'image' }> & { language: Language }) {
  const [size, setSize] = useState(initialWidth ?? (fullWidth ? 100 : 20))
  return (
    <div className="docs-image-control-group">
      <label className="docs-image-control">
        <span>{language === 'cs' ? 'Velikost obrázku' : 'Image size'}</span>
        <input
          type="range"
          min="20"
          max="400"
          step="10"
          value={size}
          aria-valuetext={`${size} %`}
          onChange={(event) => setSize(Number(event.target.value))}
        />
        <span>{size} %</span>
      </label>
      <figure className="docs-diagram">
        <div className="docs-image-scroll" role="region" aria-label={alt} tabIndex={0}>
          <img src={imageUrl(src)} alt={alt} style={{ width: `${size}%` }} />
        </div>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </div>
  )
}
function ContentBlock({ block, language }: { block: DocumentationBlock; language: Language }) {
  switch (block.type) {
    case 'table':
      return (
        <div
          className="docs-table-scroll"
          role="region"
          aria-label={block.headers.join(' / ')}
          tabIndex={0}
        >
          <table className="docs-table">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} data-label={block.headers[cellIndex] ?? ''}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'paragraph':
      return <p>{block.content}</p>
    case 'list':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <pre className="docs-code">
          <span>{block.language ?? 'text'}</span>
          <code>{block.content}</code>
        </pre>
      )
    case 'note':
      return <aside className={`docs-note ${block.variant}`}>{block.content}</aside>
    case 'image':
      return <Diagram {...block} language={language} />
    case 'checklist':
      return (
        <ul className="docs-checklist">
          {block.items.map((item) => (
            <li key={item.label} className={item.done ? 'done' : 'missing'}>
              <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
              {item.label}
            </li>
          ))}
        </ul>
      )
  }
}

function renderInlineMarkdown(text: string) {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  return text
    .split(tokenPattern)
    .filter(Boolean)
    .map((token, index) => {
      if (token.startsWith('**') && token.endsWith('**'))
        return <strong key={index}>{token.slice(2, -2)}</strong>
      if (token.startsWith('`') && token.endsWith('`'))
        return <code key={index}>{token.slice(1, -1)}</code>
      if (token.startsWith('*') && token.endsWith('*'))
        return <em key={index}>{token.slice(1, -1)}</em>
      return token
    })
}

function C06Document() {
  const lines = c06Source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = line.match(/^```(.*)$/)
    if (fence) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++])
      index += 1
      blocks.push(
        <pre className="docs-code" key={`code-${index}`}>
          <span>{fence[1] || 'text'}</span>
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = Math.min(heading[1].length, 3)
      const content = renderInlineMarkdown(heading[2])
      blocks.push(
        level === 1 ? (
          <h1 key={`heading-${index}`}>{content}</h1>
        ) : level === 2 ? (
          <h2 key={`heading-${index}`}>{content}</h2>
        ) : (
          <h3 key={`heading-${index}`}>{content}</h3>
        ),
      )
      index += 1
      continue
    }

    if (
      line.trimStart().startsWith('|') &&
      index + 1 < lines.length &&
      /^\s*\|?\s*:?-[-:| ]+\|?\s*$/.test(lines[index + 1])
    ) {
      const splitRow = (row: string) => {
        const content = row.trim().replace(/^\|/, '').replace(/\|$/, '')
        const cells: string[] = []
        let cell = ''
        let inCodeSpan = false

        for (let index = 0; index < content.length; index += 1) {
          const character = content[index]
          if (character === '`') {
            inCodeSpan = !inCodeSpan
            cell += character
          } else if (character === '\\' && content[index + 1] === '|' && !inCodeSpan) {
            cell += '|'
            index += 1
          } else if (character === '|' && !inCodeSpan) {
            cells.push(cell.trim())
            cell = ''
          } else {
            cell += character
          }
        }

        cells.push(cell.trim())
        return cells
      }
      const headers = splitRow(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && lines[index].trimStart().startsWith('|'))
        rows.push(splitRow(lines[index++]))
      blocks.push(
        <div
          className="docs-table-scroll"
          role="region"
          aria-label={headers.join(' / ')}
          tabIndex={0}
          key={`table-${index}`}
        >
          <table className="docs-table">
            <thead>
              <tr>
                {headers.map((cell, cellIndex) => (
                  <th key={cellIndex} scope="col">
                    {renderInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} data-label={headers[cellIndex] ?? ''}>
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const listItem = line.match(/^\s*[-*+]\s+(.*)$/)
    if (listItem) {
      const items: string[] = []
      while (index < lines.length) {
        const match = lines[index].match(/^\s*[-*+]\s+(.*)$/)
        if (!match) break
        items.push(match[1])
        index += 1
      }
      blocks.push(
        <ul key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    const paragraph = [line.trim()]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|```|\s*\|)/.test(lines[index]) &&
      !/^\s*[-*+]\s+/.test(lines[index])
    )
      paragraph.push(lines[index++].trim())
    blocks.push(<p key={`paragraph-${index}`}>{renderInlineMarkdown(paragraph.join(' '))}</p>)
  }

  return <div className="docs-blocks docs-c06-source">{blocks}</div>
}

export default function DocumentationPage({ language, t }: DocumentationPageProps) {
  const [tab, setTab] = useState<DocsSection>('c01')
  const documents = useMemo<Record<Language, Record<StructuredDocsSection, Documentation>>>(
    () => ({
      cs: {
        c01: parseDocumentation(csC01, 'C01 / cs'),
        c02: parseDocumentation(csC02, 'C02 / cs'),
        c03a: parseDocumentation(csC03A, 'C03A / cs'),
        c03b: parseDocumentation(csC03B, 'C03B / cs'),
        c05: parseDocumentation(csC05, 'C05 / cs'),
      },
      en: {
        c01: parseDocumentation(enC01, 'C01 / en'),
        c02: parseDocumentation(enC02, 'C02 / en'),
        c03a: parseDocumentation(enC03A, 'C03A / en'),
        c03b: parseDocumentation(enC03B, 'C03B / en'),
        c05: parseDocumentation(enC05, 'C05 / en'),
      },
    }),
    [],
  )
  const current = tab === 'c06' ? null : documents[language][tab]
  return (
    <main className="docs-page">
      <section className="docs-card">
        <div className="docs-tabs" role="tablist" aria-label={t('documentation')}>
          {tabs.map((item) => (
            <button
              key={item}
              className={`${tab === item ? 'active' : ''} ${item === 'c06' ? 'c6-tab' : ''}`.trim()}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        <article className="docs-content">
          <div className="docs-document">
            {tab !== 'c06' && <p className="docs-eyebrow">{t('documentation')}</p>}
            {current ? (
              <>
                <h1>{current.title}</h1>
                <div className="docs-blocks">
                  {current.sections.map((section) => (
                    <section key={section.id} className="docs-block">
                      <h2>{section.title}</h2>
                      {section.blocks.map((block, index) => (
                        <ContentBlock
                          key={`${section.id}-${index}`}
                          block={block}
                          language={language}
                        />
                      ))}
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <C06Document />
            )}
          </div>
        </article>
      </section>
    </main>
  )
}
