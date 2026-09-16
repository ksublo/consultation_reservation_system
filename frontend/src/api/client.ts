import type { ApiError, ConsultationSlot, Session, UserRole } from '../types/api'

const API_ROOT = '/api'

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T | ApiError
  if (!response.ok) throw new Error((body as ApiError).message ?? 'Operaci se nepodařilo dokončit.')
  return body as T
}

function authorization(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export const api = {
  login: async (login: string, password: string, role: UserRole): Promise<Session> =>
    readJson<Session>(await fetch(`${API_ROOT}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password, role }),
    })),
  logout: async (token: string): Promise<void> => {
    await fetch(`${API_ROOT}/auth/logout`, { method: 'POST', headers: authorization(token) })
  },
  getSlots: async (token: string): Promise<ConsultationSlot[]> =>
    readJson<ConsultationSlot[]>(await fetch(`${API_ROOT}/slots`, { headers: authorization(token) })),
  reserve: async (token: string, payload: { slotId: string; studentId: string; reasonTitle: string; reasonDescription: string }): Promise<void> => {
    await readJson(await fetch(`${API_ROOT}/reservations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authorization(token) }, body: JSON.stringify(payload),
    }))
  },
}
