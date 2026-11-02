import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import type { TFunction } from '../../i18n'
import type { Reservation, Session, Toast } from '../../types/api'
import MyReservationsPage from './MyReservationsPage'

vi.mock('../../api/client', () => ({
  api: {
    getReservations: vi.fn(),
    cancelReservation: vi.fn(),
  },
}))

const session: Session = {
  token: 'student-token',
  userId: 'student-1',
  firstName: 'Jan',
  lastName: 'Novák',
  login: 'JAN0001',
  activeRole: 'STUDENT',
}

const translate = ((key: string) => key) as TFunction

function makeReservation(status: Reservation['status'] = 'CONFIRMED'): Reservation {
  const startsAt = new Date(Date.now() + (status === 'CANCELLED' ? -48 : 48) * 60 * 60 * 1000)
  return {
    id: 'reservation-1',
    slotId: 'slot-1',
    studentId: session.userId,
    teacherId: 'teacher-1',
    teacherName: 'Ada Nováková',
    studentFirstName: 'Jan',
    studentLastName: 'Novák',
    studentLogin: session.login,
    studentEmail: 'jan@example.test',
    reasonTitle: 'Konzultace',
    reasonDescription: 'Dotaz',
    consultationMode: 'OFFLINE',
    teacherCabinet: null,
    status,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    confirmedAt: status === 'CONFIRMED' ? new Date().toISOString() : null,
    cancelledAt: status === 'CANCELLED' ? '2026-10-28T12:00:00Z' : null,
    cancelledByName: status === 'CANCELLED' ? 'Ada Nováková' : null,
    cancellationNote: status === 'CANCELLED' ? 'Nemoc' : null,
  }
}

function renderPage(onToast = vi.fn<(toast: Toast) => void>()) {
  return render(
    <MyReservationsPage
      session={session}
      onToast={onToast}
      refreshSignal={0}
      language="cs"
      t={translate}
    />,
  )
}

describe('MyReservationsPage cancellation flow', () => {
  beforeEach(() => {
    vi.mocked(api.getReservations).mockResolvedValue([makeReservation()])
    vi.mocked(api.cancelReservation).mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('requires confirmation and sends the entered optional reason', async () => {
    renderPage()

    await screen.findByText('Ada Nováková')
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('cancellationReason'), {
      target: { value: 'Nemoc' },
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'cancel' }))

    await waitFor(() => {
      expect(api.cancelReservation).toHaveBeenCalledWith(session.token, 'reservation-1', 'Nemoc')
    })
  })

  it('shows cancellation details from the API response', async () => {
    vi.mocked(api.getReservations).mockResolvedValue([makeReservation('CANCELLED')])
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'showHistory' }))
    fireEvent.click(screen.getByRole('button', { name: 'cancellationDetails' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Ada Nováková')).toBeTruthy()
    expect(within(dialog).getByText('Nemoc')).toBeTruthy()
    expect(within(dialog).getByText('cancelledBy')).toBeTruthy()
  })
})
