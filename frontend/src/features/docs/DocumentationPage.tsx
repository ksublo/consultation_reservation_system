import { useMemo, useState } from 'react'
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
import {
  parseDocumentation,
  type Documentation,
  type DocumentationBlock,
} from './documentation-model'

type DocsSection = 'c01' | 'c02' | 'c03a' | 'c03b' | 'c05'

interface DocumentationPageProps {
  language: Language
  t: TFunction
}

const tabs: DocsSection[] = ['c01', 'c02', 'c03a', 'c03b', 'c05']
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
                    <td key={cellIndex}>{cell}</td>
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

export default function DocumentationPage({ language, t }: DocumentationPageProps) {
  const [tab, setTab] = useState<DocsSection>('c01')
  const documents = useMemo<Record<Language, Record<DocsSection, Documentation>>>(
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
  const current = documents[language][tab]
  return (
    <main className="docs-page">
      <section className="docs-card">
        <div className="docs-tabs" role="tablist" aria-label={t('documentation')}>
          {tabs.map((item) => (
            <button
              key={item}
              className={tab === item ? 'active' : ''}
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
            <p className="docs-eyebrow">{t('documentation')}</p>
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
          </div>
        </article>
      </section>
    </main>
  )
}
