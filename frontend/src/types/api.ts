export type UserRole = 'STUDENT' | 'TEACHER'
export type ConsultationMode = 'ONLINE' | 'OFFLINE'

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
  onlineAvailable?: boolean
  offlineAvailable?: boolean
  status: 'ACTIVE' | 'CANCELLED'
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  login: string
  email: string
  cabinet?: string | null
}

export interface ApiError {
  message?: string
}

export interface Toast {
  type: 'success' | 'error'
  message: string
  durationMs?: number
}
export interface Notification {
  id: string
  reservationId: string | null
  type: string
  title: string
  message: string
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  readAt: string | null
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
  consultationMode: ConsultationMode
  teacherCabinet: string | null
  status: ReservationStatus
  startsAt: string
  endsAt: string
  createdAt: string
  confirmedAt: string | null
  cancelledAt: string | null
}
