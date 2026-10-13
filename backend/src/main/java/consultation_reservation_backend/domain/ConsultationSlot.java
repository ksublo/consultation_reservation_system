package consultation_reservation_backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "consultation_slots")
public class ConsultationSlot {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "teacher_id", nullable = false)
  private AppUser teacher;

  @Column(nullable = false)
  private OffsetDateTime startsAt;

  @Column(nullable = false)
  private OffsetDateTime endsAt;

  @Column(name = "online_available", nullable = false)
  private boolean onlineAvailable;

  @Column(name = "offline_available", nullable = false)
  private boolean offlineAvailable;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SlotStatus status;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected ConsultationSlot() {}

  public ConsultationSlot(
      AppUser teacher,
      OffsetDateTime startsAt,
      OffsetDateTime endsAt,
      boolean onlineAvailable,
      boolean offlineAvailable) {
    this.id = UUID.randomUUID();
    this.teacher = teacher;
    this.startsAt = startsAt;
    this.endsAt = endsAt;
    this.onlineAvailable = onlineAvailable;
    this.offlineAvailable = offlineAvailable;
    this.status = SlotStatus.ACTIVE;
    this.createdAt = OffsetDateTime.now();
  }

  public ConsultationSlot(AppUser teacher, OffsetDateTime startsAt, OffsetDateTime endsAt) {
    this(teacher, startsAt, endsAt, true, true);
  }

  public UUID getId() {
    return id;
  }

  public AppUser getTeacher() {
    return teacher;
  }

  public OffsetDateTime getStartsAt() {
    return startsAt;
  }

  public OffsetDateTime getEndsAt() {
    return endsAt;
  }

  public boolean isOnlineAvailable() {
    return onlineAvailable;
  }

  public boolean isOfflineAvailable() {
    return offlineAvailable;
  }

  public SlotStatus getStatus() {
    return status;
  }

  public void cancel() {
    this.status = SlotStatus.CANCELLED;
  }
}
