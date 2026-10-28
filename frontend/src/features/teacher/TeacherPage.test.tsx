import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import type { TFunction } from '../../i18n'
import type { Reservation, Session, Toast } from '../../types/api'
import TeacherPage from './TeacherPage'

vi.mock('../../api/client', () => ({
  api: {
    getTeacherSlots: vi.fn(),
    getReservations: vi.fn(),
    cancelReservation: vi.fn(),
    cancelSlot: vi.fn(),
    cancelSlotWithReservation: vi.fn(),
    createSlot: vi.fn(),
    approveReservation: vi.fn(),
  },
}))

const session: Session = {
  token: 'teacher-token',
  userId: 'teacher-1',
  firstName: 'Ada',
  lastName: 'Nováková',
  login: 'ADA0001',
  activeRole: 'TEACHER',
}

const translate = ((key: string) => key) as TFunction

function makeReservation(status: Reservation['status'] = 'PENDING'): Reservation {
  const startsAt = new Date(Date.now() + (status === 'CANCELLED' ? -48 : 48) * 60 * 60 * 1000)
  return {
    id: 'reservation-1',
    slotId: 'slot-1',
    studentId: 'student-1',
    teacherId: session.userId,
    teacherName: 'Ada Nováková',
    studentFirstName: 'Jan',
    studentLastName: 'Novák',
    studentLogin: 'JAN0001',
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
    cancellationNote: status === 'CANCELLED' ? 'Změna plánů' : null,
  }
}

function renderPage(onToast = vi.fn<(toast: Toast) => void>()) {
  return render(
    <TeacherPage session={session} onToast={onToast} view="requests" language="cs" t={translate} />,
  )
}

describe('TeacherPage cancellation flow', () => {
  beforeEach(() => {
    vi.mocked(api.getTeacherSlots).mockResolvedValue([])
    vi.mocked(api.getReservations).mockResolvedValue([makeReservation()])
    vi.mocked(api.cancelReservation).mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens confirmation before cancelling a student request and sends the reason', async () => {
    renderPage()

    await screen.findByText('Jan Novák')
    fireEvent.click(screen.getByTitle('cancel'))
    fireEvent.change(screen.getByLabelText('cancellationReason'), {
      target: { value: 'Změna plánů' },
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'cancel' }))

    await waitFor(() => {
      expect(api.cancelReservation).toHaveBeenCalledWith(
        session.token,
        'reservation-1',
        'Změna plánů',
      )
    })
  })

  it('shows cancellation details in teacher history', async () => {
    vi.mocked(api.getReservations).mockResolvedValue([makeReservation('CANCELLED')])
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'showHistory' }))
    fireEvent.click(screen.getByRole('button', { name: 'cancellationDetails' }))

    expect(screen.getByText('Změna plánů')).toBeTruthy()
    expect(screen.getByText('Ada Nováková')).toBeTruthy()
  })
})
