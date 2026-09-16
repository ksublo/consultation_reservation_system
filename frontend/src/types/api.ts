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
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
}

export interface ApiError {
  message?: string
}

export interface Toast {
  type: 'success' | 'error'
  message: string
}
