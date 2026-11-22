const reservationCutoffMs = 3 * 60 * 60 * 1000

export function canCreateReservationAt(startsAt: string, now = Date.now()) {
  return new Date(startsAt).getTime() - now > reservationCutoffMs
}
