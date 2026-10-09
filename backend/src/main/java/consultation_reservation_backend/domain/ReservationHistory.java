package consultation_reservation_backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reservation_history")
public class ReservationHistory {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_id", nullable = false)
  private Reservation reservation;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ReservationAction action;

  @Enumerated(EnumType.STRING)
  private ReservationStatus previousStatus;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ReservationStatus newStatus;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "actor_user_id", nullable = false)
  private AppUser actor;

  private String note;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected ReservationHistory() {}

  public ReservationHistory(
      Reservation reservation,
      ReservationAction action,
      ReservationStatus previousStatus,
      ReservationStatus newStatus,
      AppUser actor,
      String note) {
    this.id = UUID.randomUUID();
    this.reservation = reservation;
    this.action = action;
    this.previousStatus = previousStatus;
    this.newStatus = newStatus;
    this.actor = actor;
    this.note = note;
    this.createdAt = OffsetDateTime.now();
  }
}
