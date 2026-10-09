import { useState } from 'react'
import type { Language, TFunction } from '../../i18n'
import csDocumentation from './cs.json'
import csC03B from './c03-b/cs.json'
import enDocumentation from './en.json'
import enC03B from './c03-b/en.json'

type DocsSection = 'c01' | 'c02' | 'c03a' | 'c03b'
type Block =
  | { type: 'paragraph'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] }
  | { type: 'code'; language?: string; content: string }
  | { type: 'note'; variant: 'info' | 'warning'; content: string }
  | { type: 'image'; src: string; alt: string; caption?: string; fullWidth?: boolean }
  | { type: 'checklist'; items: { label: string; done: boolean }[] }
type DocSection = { id: string; title: string; blocks: Block[] }
type Document = { title: string; sections: DocSection[] }

interface DocumentationPageProps {
  language: Language
  t: TFunction
}

const tabs: DocsSection[] = ['c01', 'c02', 'c03a', 'c03b']
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
  language,
}: Extract<Block, { type: 'image' }> & { language: Language }) {
  const [size, setSize] = useState(20)
  if (fullWidth) {
    return (
      <figure className="docs-flow-figure">
        <div
          className="docs-flow-scroll"
          role="region"
          aria-label={
            language === 'cs' ? 'Diagram schválení rezervace' : 'Reservation approval diagram'
          }
          tabIndex={0}
        >
          <img src={imageUrl(src)} alt={alt} />
        </div>
        <figcaption>
          {caption ??
            (language === 'cs'
              ? 'Na menší obrazovce lze diagram posunout do stran.'
              : 'On smaller screens, scroll horizontally to view the diagram.')}
        </figcaption>
      </figure>
    )
  }
  return (
    <div className="docs-image-control-group">
      <label className="docs-image-control">
        <span>{language === 'cs' ? 'Velikost obrázku' : 'Image size'}</span>
        <input
          type="range"
          min="20"
          max="100"
          value={size}
          onChange={(event) => setSize(Number(event.target.value))}
        />
      </label>
      <figure className="docs-diagram" style={{ width: `${size}%` }}>
        <img src={imageUrl(src)} alt={alt} />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </div>
  )
}
function ContentBlock({ block, language }: { block: Block; language: Language }) {
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
  const documents =
    language === 'cs'
      ? { ...csDocumentation, c03a: csDocumentation.c03, c03b: csC03B }
      : { ...enDocumentation, c03a: enDocumentation.c03, c03b: enC03B }
  const current = documents[tab] as Document
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
