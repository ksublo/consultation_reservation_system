package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.ConsultationSlot;
import consultation_reservation_backend.domain.ReservationStatus;
import consultation_reservation_backend.domain.SlotStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ConsultationSlotRepository extends JpaRepository<ConsultationSlot, UUID> {
    List<ConsultationSlot> findByTeacher_IdOrderByStartsAt(UUID teacherId);

    @Query("""
            select slot from ConsultationSlot slot
            where slot.status = :slotStatus and slot.startsAt >= :from
              and not exists (select reservation from Reservation reservation where reservation.slot = slot and reservation.status in :reservationStatuses)
            order by slot.startsAt
            """)
    List<ConsultationSlot> findAvailable(@Param("slotStatus") SlotStatus slotStatus, @Param("from") OffsetDateTime from, @Param("reservationStatuses") List<ReservationStatus> reservationStatuses);
}
