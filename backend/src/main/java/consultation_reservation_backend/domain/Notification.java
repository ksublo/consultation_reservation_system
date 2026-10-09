package consultation_reservation_backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "recipient_user_id", nullable = false)
  private AppUser recipient;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_id")
  private Reservation reservation;

  @Column(nullable = false)
  private String type;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false)
  private String message;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  private OffsetDateTime readAt;

  protected Notification() {}

  public Notification(
      AppUser recipient, Reservation reservation, String type, String title, String message) {
    id = UUID.randomUUID();
    this.recipient = recipient;
    this.reservation = reservation;
    this.type = type;
    this.title = title;
    this.message = message;
    createdAt = OffsetDateTime.now();
  }

  public UUID getId() {
    return id;
  }

  public String getType() {
    return type;
  }

  public String getTitle() {
    return title;
  }

  public String getMessage() {
    return message;
  }

  public Reservation getReservation() {
    return reservation;
  }

  public UUID getReservationId() {
    return reservation == null ? null : reservation.getId();
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getReadAt() {
    return readAt;
  }

  public void markRead() {
    if (readAt == null) readAt = OffsetDateTime.now();
  }
}
