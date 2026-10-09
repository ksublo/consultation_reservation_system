import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import type { TFunction } from '../../i18n'
import type { ConsultationSlot, Session, Teacher, Toast } from '../../types/api'
import BookingPage from './BookingPage'

vi.mock('../../api/client', () => ({
  api: {
    getSlots: vi.fn(),
    getTeachers: vi.fn(),
    getTeacherSlots: vi.fn(),
    reserve: vi.fn(),
  },
}))

const session: Session = {
  token: 'student-token',
  userId: 'student-1',
  firstName: 'Student',
  lastName: 'One',
  login: 'student1',
  activeRole: 'STUDENT',
}

const teacher: Teacher = {
  id: 'teacher-1',
  firstName: 'Ada',
  lastName: 'Nováková',
  login: 'anovak',
  email: 'ada@example.test',
}

const translate = ((key: string) => key) as TFunction

function makeSlot(hoursFromNow: number): ConsultationSlot {
  const startsAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
  return {
    id: 'slot-1',
    teacherId: teacher.id,
    teacherName: `${teacher.firstName} ${teacher.lastName}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    status: 'ACTIVE',
  }
}

function renderBookingPage(onToast = vi.fn<(toast: Toast) => void>()) {
  return render(
    <BookingPage
      session={session}
      onToast={onToast}
      refreshSignal={0}
      language="cs"
      t={translate}
    />,
  )
}

async function selectTeacherAndSlot() {
  const teacherSearch = screen.getByLabelText('teacher')
  fireEvent.change(teacherSearch, { target: { value: 'Ada' } })
  fireEvent.click(await screen.findByRole('button', { name: /Ada Nováková/ }))

  return screen.findByRole('button', { name: /\d{1,2}:\d{2}–\d{1,2}:\d{2}/ })
}

describe('BookingPage reservation flow', () => {
  beforeEach(() => {
    vi.mocked(api.getSlots).mockResolvedValue([])
    vi.mocked(api.getTeachers).mockResolvedValue([teacher])
    vi.mocked(api.getTeacherSlots).mockResolvedValue([])
    vi.mocked(api.reserve).mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  it('submits a selected slot and consultation details, then refreshes the form', async () => {
    const slot = makeSlot(48)
    vi.mocked(api.getSlots).mockResolvedValue([slot])
    vi.mocked(api.getTeacherSlots).mockResolvedValue([slot])
    const onToast = vi.fn<(toast: Toast) => void>()
    renderBookingPage(onToast)

    const slotButton = await selectTeacherAndSlot()
    fireEvent.click(await slotButton)
    fireEvent.change(screen.getByLabelText('reasonTitle'), {
      target: { value: 'Databázový návrh' },
    })
    fireEvent.change(screen.getByLabelText('reasonDescription'), {
      target: { value: 'Potřebuji probrat návrh tabulek.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'reserveConsultation' }))

    await waitFor(() => {
      expect(api.reserve).toHaveBeenCalledWith(session.token, {
        slotId: slot.id,
        studentId: session.userId,
        reasonTitle: 'Databázový návrh',
        reasonDescription: 'Potřebuji probrat návrh tabulek.',
      })
    })
    expect(onToast).toHaveBeenCalledWith({ type: 'success', message: 'reservationCreated' })
    expect(api.getSlots).toHaveBeenCalledTimes(2)
    expect((screen.getByLabelText('reasonTitle') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('reasonDescription') as HTMLTextAreaElement).value).toBe('')
  })

  it('does not submit a reservation less than three hours before the slot', async () => {
    const slot = makeSlot(2)
    vi.mocked(api.getSlots).mockResolvedValue([slot])
    vi.mocked(api.getTeacherSlots).mockResolvedValue([slot])
    const onToast = vi.fn<(toast: Toast) => void>()
    renderBookingPage(onToast)

    fireEvent.click(await selectTeacherAndSlot())
    fireEvent.change(screen.getByLabelText('reasonTitle'), { target: { value: 'Konzultace' } })
    fireEvent.change(screen.getByLabelText('reasonDescription'), {
      target: { value: 'Krátký popis' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'reserveConsultation' }))

    expect(api.reserve).not.toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledWith({ type: 'error', message: 'reservationCutoffFailed' })
  })

  it('shows the conflict returned when another student reserves the slot first', async () => {
    const slot = makeSlot(48)
    vi.mocked(api.getSlots).mockResolvedValueOnce([slot]).mockResolvedValueOnce([])
    vi.mocked(api.getTeacherSlots).mockResolvedValue([slot])
    vi.mocked(api.reserve).mockRejectedValue(
      new Error('Tento termín právě rezervoval jiný student.'),
    )
    const onToast = vi.fn<(toast: Toast) => void>()
    renderBookingPage(onToast)

    fireEvent.click(await selectTeacherAndSlot())
    fireEvent.change(screen.getByLabelText('reasonTitle'), { target: { value: 'Konzultace' } })
    fireEvent.change(screen.getByLabelText('reasonDescription'), {
      target: { value: 'Potřebuji konzultaci.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'reserveConsultation' }))

    await waitFor(() => {
      expect(onToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'slotReservedByAnotherStudent',
        durationMs: 10000,
      })
      expect(api.getSlots).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByText('0 free')).toBeTruthy()
    expect(screen.getByRole('button', { name: /occupied/i }).hasAttribute('disabled')).toBe(true)
  })

  it('disables a teacher slot that is no longer in the availability response', async () => {
    const slot = makeSlot(48)
    vi.mocked(api.getSlots).mockResolvedValue([slot])
    vi.mocked(api.getTeacherSlots).mockResolvedValue([slot])
    const page = renderBookingPage()

    await selectTeacherAndSlot()
    vi.mocked(api.getSlots).mockResolvedValue([])
    page.rerender(
      <BookingPage
        session={session}
        onToast={vi.fn()}
        refreshSignal={1}
        language="cs"
        t={translate}
      />,
    )

    await waitFor(() => {
      expect(api.getSlots).toHaveBeenCalledTimes(2)
      const refreshedSlotButton = screen.getByRole('button', {
        name: /\d{1,2}:\d{2}–\d{1,2}:\d{2}/,
      })
      expect(refreshedSlotButton.hasAttribute('disabled')).toBe(true)
    })
    expect(screen.getByText('0 free')).toBeTruthy()
  })
})
