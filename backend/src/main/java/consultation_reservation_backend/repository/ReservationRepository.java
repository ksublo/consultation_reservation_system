package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.Reservation;
import consultation_reservation_backend.domain.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    Optional<Reservation> findBySlotIdAndStatusIn(UUID slotId, List<ReservationStatus> statuses);
    List<Reservation> findByStudentIdOrSlotTeacherIdOrderByCreatedAtDesc(UUID studentId, UUID teacherId);
}
