package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.Reservation;
import consultation_reservation_backend.domain.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    Optional<Reservation> findBySlotIdAndStatusIn(UUID slotId, List<ReservationStatus> statuses);
    List<Reservation> findByStudentIdOrSlotTeacherIdOrderByCreatedAtDesc(UUID studentId, UUID teacherId);
    long countByStudentIdAndStatus(UUID studentId, ReservationStatus status);

    @Query("""
            select reservation from Reservation reservation
            where reservation.student.id = :studentId
              and reservation.status in :statuses
              and reservation.slot.startsAt < :endsAt
              and reservation.slot.endsAt > :startsAt
            """)
    List<Reservation> findOverlappingForStudent(@Param("studentId") UUID studentId,
                                                @Param("startsAt") OffsetDateTime startsAt,
                                                @Param("endsAt") OffsetDateTime endsAt,
                                                @Param("statuses") List<ReservationStatus> statuses);
}
