import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { TFunction } from '../../i18n'
import DocumentationPage from './DocumentationPage'

const translate = ((key: string) => key) as TFunction

describe('DocumentationPage C10', () => {
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
})
