package consultation_reservation_backend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReservationExpiryScheduler {
  private final ReservationService reservations;

  public ReservationExpiryScheduler(ReservationService reservations) {
    this.reservations = reservations;
  }

  @Scheduled(fixedDelayString = "${app.reservations.expiry-poll-interval-ms:1000}")
  public void cancelExpiredPendingReservations() {
    reservations.cancelExpiredPendingReservations();
  }
}
