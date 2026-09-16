import type { ApiError, ConsultationSlot, Session, UserRole } from '../types/api'

const API_ROOT = '/api'

async function readJson<T>(response: Response): Promise<T> {
  const rawBody = await response.text()
  let body: T | ApiError | undefined
  if (rawBody) {
    try { body = JSON.parse(rawBody) as T | ApiError }
    catch { throw new Error('Server vrátil neplatnou odpověď. Zkuste akci opakovat.') }
  }
  if (!response.ok) throw new Error((body as ApiError | undefined)?.message ?? `Operaci se nepodařilo dokončit (${response.status}).`)
  if (body === undefined) return undefined as T
  return body as T
}

function authorization(token: string): HeadersInit { return { Authorization: `Bearer ${token}` } }

export const api = {
  login: async (login: string, password: string, role: UserRole): Promise<Session> => readJson<Session>(await fetch(`${API_ROOT}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password, role }) })),
  logout: async (token: string): Promise<void> => { await fetch(`${API_ROOT}/auth/logout`, { method: 'POST', headers: authorization(token) }) },
  getSlots: async (token: string): Promise<ConsultationSlot[]> => readJson<ConsultationSlot[]>(await fetch(`${API_ROOT}/slots`, { headers: authorization(token) })),
  reserve: async (token: string, payload: { slotId: string; studentId: string; reasonTitle: string; reasonDescription: string }): Promise<void> => { await readJson<void>(await fetch(`${API_ROOT}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorization(token) }, body: JSON.stringify(payload) })) },
}
