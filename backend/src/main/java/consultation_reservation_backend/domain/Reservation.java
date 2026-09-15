package consultation_reservation_backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reservations")
public class Reservation {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "slot_id", nullable = false)
    private ConsultationSlot slot;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "student_id", nullable = false)
    private AppUser student;
    @Column(nullable = false) private String reasonTitle;
    @Column(nullable = false) private String reasonDescription;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ReservationStatus status;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "cancelled_by_user_id")
    private AppUser cancelledByUser;
    private String cancellationNote;
    @Column(nullable = false) private OffsetDateTime createdAt;
    private OffsetDateTime confirmedAt;
    private OffsetDateTime cancelledAt;

    protected Reservation() { }
    public Reservation(ConsultationSlot slot, AppUser student, String reasonTitle, String reasonDescription) {
        this.id = UUID.randomUUID(); this.slot = slot; this.student = student; this.reasonTitle = reasonTitle;
        this.reasonDescription = reasonDescription; this.status = ReservationStatus.PENDING; this.createdAt = OffsetDateTime.now();
    }
    public UUID getId() { return id; }
    public ConsultationSlot getSlot() { return slot; }
    public AppUser getStudent() { return student; }
    public String getReasonTitle() { return reasonTitle; }
    public String getReasonDescription() { return reasonDescription; }
    public ReservationStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getConfirmedAt() { return confirmedAt; }
    public OffsetDateTime getCancelledAt() { return cancelledAt; }
    public void confirm() { this.status = ReservationStatus.CONFIRMED; this.confirmedAt = OffsetDateTime.now(); }
    public void cancel(AppUser actor, String note) { this.status = ReservationStatus.CANCELLED; this.cancelledByUser = actor; this.cancellationNote = note; this.cancelledAt = OffsetDateTime.now(); }
}
