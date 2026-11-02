import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TFunction } from '../i18n'
import type { Reservation } from '../types/api'
import CancellationDialog from './CancellationDialog'

const translate = ((key: string) => key) as TFunction

const reservation: Reservation = {
  id: 'reservation-1',
  slotId: 'slot-1',
  studentId: 'student-1',
  teacherId: 'teacher-1',
  teacherName: 'Ada Nováková',
  studentFirstName: 'Jan',
  studentLastName: 'Novák',
  studentLogin: 'jan.novak',
  studentEmail: 'jan@example.test',
  reasonTitle: 'Konzultace',
  reasonDescription: 'Dotaz',
  consultationMode: 'OFFLINE',
  teacherCabinet: null,
  status: 'CONFIRMED',
  startsAt: '2026-11-01T10:00:00Z',
  endsAt: '2026-11-01T10:30:00Z',
  createdAt: '2026-10-01T10:00:00Z',
  confirmedAt: '2026-10-02T10:00:00Z',
  cancelledAt: null,
  cancelledByName: null,
  cancellationNote: null,
}

afterEach(cleanup)

describe('CancellationDialog', () => {
  it('sends the entered reason only after the user confirms', () => {
    const onConfirm = vi.fn()
    render(
      <CancellationDialog
        reservation={reservation}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        t={translate}
      />,
    )

    fireEvent.change(screen.getByLabelText('cancellationReason'), {
      target: { value: 'Nemohu přijít' },
    })
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(onConfirm).toHaveBeenCalledWith('Nemohu přijít')
  })

  it('allows cancellation without a reason', () => {
    const onConfirm = vi.fn()
    render(
      <CancellationDialog
        reservation={reservation}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        t={translate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(onConfirm).toHaveBeenCalledWith('')
  })
})
