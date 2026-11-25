import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { TFunction } from '../../i18n'
import DocumentationPage from './DocumentationPage'

const translate = ((key: string) => key) as TFunction

describe('DocumentationPage structured evidence', () => {
  afterEach(cleanup)

  it('opens the C10 operational evidence in both languages', () => {
    const page = render(<DocumentationPage language="cs" t={translate} />)

    fireEvent.click(screen.getByRole('tab', { name: 'C10' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'C10 · Provozní situace a logy' }),
    ).toBeTruthy()
    expect(screen.getByText(/Baseline vrátila nesprávné 403/)).toBeTruthy()

    page.rerender(<DocumentationPage language="en" t={translate} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'C10 · Operational situations and logs' }),
    ).toBeTruthy()
    expect(screen.getByText(/The baseline returned an incorrect empty 403/)).toBeTruthy()
  })

  it('opens the prepared C11 validation plan in both languages', () => {
    const page = render(<DocumentationPage language="cs" t={translate} />)

    fireEvent.click(screen.getByRole('tab', { name: 'C11' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'C11 · Plán validace produktu' }),
    ).toBeTruthy()
    expect(screen.getByText(/PŘIPRAVENO \/ NOT RUN/)).toBeTruthy()
    expect(screen.getAllByText(/Pozorované uživatelské úlohy/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/PASS:/)).toBeNull()

    page.rerender(<DocumentationPage language="en" t={translate} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'C11 · Product validation plan' }),
    ).toBeTruthy()
    expect(screen.getByText(/PREPARED \/ NOT RUN/)).toBeTruthy()
    expect(screen.getAllByText(/Observed user tasks/).length).toBeGreaterThan(0)
  })
})
