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

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SlotStatus status;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected ConsultationSlot() {}

  public ConsultationSlot(AppUser teacher, OffsetDateTime startsAt, OffsetDateTime endsAt) {
    this.id = UUID.randomUUID();
    this.teacher = teacher;
    this.startsAt = startsAt;
    this.endsAt = endsAt;
    this.status = SlotStatus.ACTIVE;
    this.createdAt = OffsetDateTime.now();
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

  public SlotStatus getStatus() {
    return status;
  }

  public void cancel() {
    this.status = SlotStatus.CANCELLED;
  }
}
