import type { ApiError, ConsultationSlot, Reservation, Session, Teacher, UserRole } from '../types/api'
import type { Language } from '../i18n'
const API_ROOT = '/api'
let apiLanguage: Language = sessionStorage.getItem('language') === 'en' ? 'en' : 'cs'
const apiMessages: Record<string, Record<Language, string>> = {
  'Server vrátil neplatnou odpověď.': { cs: 'Server vrátil neplatnou odpověď.', en: 'The server returned an invalid response.' },
  'Login nesmí být delší než 7 znaků.': { cs: 'Login nesmí být delší než 7 znaků.', en: 'Login cannot be longer than 7 characters.' },
  'Login musí mít formát ABC1234.': { cs: 'Login musí mít formát ABC1234.', en: 'Login must use the ABC1234 format.' },
  'Neplatný login nebo heslo.': { cs: 'Neplatný login nebo heslo.', en: 'Invalid login or password.' },
  'Tento účet nemá zvolenou roli.': { cs: 'Tento účet nemá zvolenou roli.', en: 'This account does not have the selected role.' },
  'User not found.': { cs: 'Uživatel nebyl nalezen.', en: 'User not found.' },
  'Slot not found.': { cs: 'Termín nebyl nalezen.', en: 'Slot not found.' },
  'Reservation not found.': { cs: 'Rezervace nebyla nalezena.', en: 'Reservation not found.' },
  'Slot end must be after its start.': { cs: 'Konec termínu musí být po jeho začátku.', en: 'Slot end must be after its start.' },
  'A slot must start in the future.': { cs: 'Termín musí začínat v budoucnosti.', en: 'A slot must start in the future.' },
  'Only a teacher can create slots.': { cs: 'Termíny může vytvářet pouze pedagog.', en: 'Only a teacher can create slots.' },
  'This slot overlaps another active slot of the teacher.': { cs: 'Tento termín se překrývá s jiným aktivním termínem pedagoga.', en: 'This slot overlaps another active slot of the teacher.' },
  'Only the slot owner can cancel it.': { cs: 'Termín může zrušit pouze jeho vlastník.', en: 'Only the slot owner can cancel it.' },
  'Obsazený termín nelze zrušit.': { cs: 'Obsazený termín nelze zrušit.', en: 'An occupied slot cannot be cancelled.' },
  'Consultation duration must be 15, 30, 45, 60, or 90 minutes.': { cs: 'Délka konzultace musí být 15, 30, 45, 60 nebo 90 minut.', en: 'Consultation duration must be 15, 30, 45, 60, or 90 minutes.' },
  'Consultations can be created only Monday to Friday.': { cs: 'Konzultace lze vytvářet pouze od pondělí do pátku.', en: 'Consultations can be created only Monday to Friday.' },
  'Consultations must be within working hours 07:15-19:15.': { cs: 'Konzultace musí být v pracovní době 07:15-19:15.', en: 'Consultations must be within working hours 07:15-19:15.' },
  'Only a student can create a reservation.': { cs: 'Rezervaci může vytvořit pouze student.', en: 'Only a student can create a reservation.' },
  'This slot is not available.': { cs: 'Tento termín není dostupný.', en: 'This slot is not available.' },
  'Reservations must be created at least 3 hours before the consultation starts.': { cs: 'Rezervaci lze vytvořit nejpozději 3 hodiny před začátkem konzultace.', en: 'Reservations must be created at least 3 hours before the consultation starts.' },
  'This slot is already reserved.': { cs: 'Tento termín je již rezervovaný.', en: 'This slot is already reserved.' },
  'A student can have at most 3 pending reservations.': { cs: 'Student může mít nejvýše 3 rezervace čekající na schválení.', en: 'A student can have at most 3 pending reservations.' },
  'The student already has an overlapping reservation.': { cs: 'Student už má překrývající se rezervaci.', en: 'The student already has an overlapping reservation.' },
  'This slot was just reserved by another student.': { cs: 'Tento termín právě rezervoval jiný student.', en: 'This slot was just reserved by another student.' },
  "Only the slot's teacher can approve it.": { cs: 'Rezervaci může schválit pouze pedagog daného termínu.', en: "Only the slot's teacher can approve it." },
  'Only a pending reservation can be approved.': { cs: 'Schválit lze pouze rezervaci čekající na schválení.', en: 'Only a pending reservation can be approved.' },
  "Only the student or the slot's teacher can cancel it.": { cs: 'Rezervaci může zrušit pouze student nebo pedagog daného termínu.', en: "Only the student or the slot's teacher can cancel it." },
  'Reservation is already cancelled.': { cs: 'Rezervace je již stornovaná.', en: 'Reservation is already cancelled.' },
  'Reservations cannot be cancelled less than 3 hours before the consultation starts.': { cs: 'Rezervaci nelze zrušit méně než 3 hodiny před začátkem konzultace.', en: 'Reservations cannot be cancelled less than 3 hours before the consultation starts.' },
  'Cancelling a confirmed reservation requires a reason.': { cs: 'Zrušení schválené rezervace vyžaduje důvod.', en: 'Cancelling a confirmed reservation requires a reason.' },
}
function translateApiMessage(message: string): string { return apiMessages[message]?.[apiLanguage] ?? message }
async function readJson<T>(response: Response): Promise<T> { const raw = await response.text(); let body: T | ApiError | undefined; if (raw) { try { body = JSON.parse(raw) as T | ApiError } catch { throw new Error(translateApiMessage('Server vrátil neplatnou odpověď.')) } } if (!response.ok) { const message = (body as ApiError | undefined)?.message; throw new Error(message ? translateApiMessage(message) : `${apiLanguage === 'cs' ? 'Operaci se nepodařilo dokončit' : 'The operation could not be completed'} (${response.status}).`) } return body as T }
const authorization = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` })
export const api = {
  setLanguage: (language: Language): void => { apiLanguage = language },
  login: async (login: string, password: string, role: UserRole): Promise<Session> => readJson<Session>(await fetch(`${API_ROOT}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password, role }) })),
  logout: async (token: string): Promise<void> => { await fetch(`${API_ROOT}/auth/logout`, { method: 'POST', headers: authorization(token) }) },
  getSlots: async (token: string): Promise<ConsultationSlot[]> => readJson<ConsultationSlot[]>(await fetch(`${API_ROOT}/slots`, { headers: authorization(token) })),
  getTeachers: async (token: string): Promise<Teacher[]> => readJson<Teacher[]>(await fetch(`${API_ROOT}/users/teachers`, { headers: authorization(token) })),
  getTeacherSlots: async (token: string, teacherId: string): Promise<ConsultationSlot[]> => readJson<ConsultationSlot[]>(await fetch(`${API_ROOT}/slots/mine?teacherId=${teacherId}`, { headers: authorization(token) })),
  createSlot: async (token: string, teacherId: string, startsAt: string, endsAt: string): Promise<ConsultationSlot> => readJson<ConsultationSlot>(await fetch(`${API_ROOT}/slots`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorization(token) }, body: JSON.stringify({ teacherId, startsAt, endsAt }) })),
  cancelSlot: async (token: string, slotId: string, actorUserId: string): Promise<void> => { await readJson<void>(await fetch(`${API_ROOT}/slots/${slotId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorization(token) }, body: JSON.stringify({ actorUserId }) })) },
  getReservations: async (token: string, userId: string): Promise<Reservation[]> => readJson<Reservation[]>(await fetch(`${API_ROOT}/reservations?userId=${userId}`, { headers: authorization(token) })),
  approveReservation: async (token: string, id: string, actorUserId: string): Promise<void> => { await readJson<void>(await fetch(`${API_ROOT}/reservations/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorization(token) }, body: JSON.stringify({ actorUserId }) })) },
  cancelReservation: async (token: string, id: string, actorUserId: string): Promise<void> => { await readJson<void>(await fetch(`${API_ROOT}/reservations/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorization(token) }, body: JSON.stringify({ actorUserId }) })) },
  reserve: async (token: string, payload: { slotId: string; studentId: string; reasonTitle: string; reasonDescription: string }): Promise<void> => { await readJson<void>(await fetch(`${API_ROOT}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorization(token) }, body: JSON.stringify(payload) })) },
}
