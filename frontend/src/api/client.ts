import type { ApiError, ConsultationSlot, Reservation, Session, UserRole } from '../types/api'
const API_ROOT = '/api'
async function readJson<T>(response: Response): Promise<T> { const raw = await response.text(); let body: T | ApiError | undefined; if (raw) { try { body = JSON.parse(raw) as T | ApiError } catch { throw new Error('Server vrátil neplatnou odpověď.') } } if (!response.ok) throw new Error((body as ApiError | undefined)?.message ?? `Operaci se nepodařilo dokončit (${response.status}).`); return body as T }
const authorization = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` })
export const api = {
 login: async (login:string,password:string,role:UserRole):Promise<Session> => readJson<Session>(await fetch(`${API_ROOT}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login,password,role})})),
 logout: async(token:string):Promise<void>=>{await fetch(`${API_ROOT}/auth/logout`,{method:'POST',headers:authorization(token)})},
 getSlots: async(token:string):Promise<ConsultationSlot[]>=>readJson<ConsultationSlot[]>(await fetch(`${API_ROOT}/slots`,{headers:authorization(token)})),
 getTeacherSlots: async(token:string,teacherId:string):Promise<ConsultationSlot[]>=>readJson<ConsultationSlot[]>(await fetch(`${API_ROOT}/slots/mine?teacherId=${teacherId}`,{headers:authorization(token)})),
 createSlot: async(token:string,teacherId:string,startsAt:string,endsAt:string):Promise<ConsultationSlot>=>readJson<ConsultationSlot>(await fetch(`${API_ROOT}/slots`,{method:'POST',headers:{'Content-Type':'application/json',...authorization(token)},body:JSON.stringify({teacherId,startsAt,endsAt})})),
 cancelSlot: async(token:string,slotId:string,actorUserId:string):Promise<void>=>{await readJson<void>(await fetch(`${API_ROOT}/slots/${slotId}/cancel`,{method:'POST',headers:{'Content-Type':'application/json',...authorization(token)},body:JSON.stringify({actorUserId})}))},
 getReservations: async(token:string,userId:string):Promise<Reservation[]>=>readJson<Reservation[]>(await fetch(`${API_ROOT}/reservations?userId=${userId}`,{headers:authorization(token)})),
 approveReservation: async(token:string,id:string,actorUserId:string):Promise<void>=>{await readJson<void>(await fetch(`${API_ROOT}/reservations/${id}/approve`,{method:'POST',headers:{'Content-Type':'application/json',...authorization(token)},body:JSON.stringify({actorUserId})}))},
 cancelReservation: async(token:string,id:string,actorUserId:string):Promise<void>=>{await readJson<void>(await fetch(`${API_ROOT}/reservations/${id}/cancel`,{method:'POST',headers:{'Content-Type':'application/json',...authorization(token)},body:JSON.stringify({actorUserId})}))},
 reserve: async(token:string,payload:{slotId:string;studentId:string;reasonTitle:string;reasonDescription:string}):Promise<void>=>{await readJson<void>(await fetch(`${API_ROOT}/reservations`,{method:'POST',headers:{'Content-Type':'application/json',...authorization(token)},body:JSON.stringify(payload)}))}
}
