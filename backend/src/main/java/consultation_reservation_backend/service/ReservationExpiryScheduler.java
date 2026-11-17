package consultation_reservation_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionException;

@Component
public class ReservationExpiryScheduler {
  private static final Logger LOG = LoggerFactory.getLogger(ReservationExpiryScheduler.class);
  private final ReservationService reservations;

  public ReservationExpiryScheduler(ReservationService reservations) {
    this.reservations = reservations;
  }

  @Scheduled(fixedDelayString = "${app.reservations.expiry-poll-interval-ms:1000}")
  public void cancelExpiredPendingReservations() {
    try {
      reservations.cancelExpiredPendingReservations();
    } catch (DataAccessException | TransactionException exception) {
      LOG.error(
          "event=reservation_expiry_dependency_failure operation=cancelExpiredPendingReservations failureType={} outcome=retry_on_next_schedule",
          exception.getClass().getSimpleName());
    }
  }
}
