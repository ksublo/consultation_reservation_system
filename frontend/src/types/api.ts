export type UserRole = 'STUDENT' | 'TEACHER'

export interface Session {
  token: string
  userId: string
  firstName: string
  lastName: string
  login: string
  activeRole: UserRole
}

export interface ConsultationSlot {
  id: string
  teacherId: string
  teacherName: string
  startsAt: string
  endsAt: string
  status: 'ACTIVE' | 'CANCELLED'
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  login: string
}

export interface ApiError {
  message?: string
}

export interface Toast {
  type: 'success' | 'error'
  message: string
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'
export interface Reservation {
  id: string
  slotId: string
  studentId: string
  teacherId: string
  teacherName: string
  studentFirstName: string
  studentLastName: string
  studentLogin: string
  studentEmail: string
  reasonTitle: string
  reasonDescription: string
  status: ReservationStatus
  startsAt: string
  endsAt: string
  createdAt: string
  confirmedAt: string | null
  cancelledAt: string | null
}
