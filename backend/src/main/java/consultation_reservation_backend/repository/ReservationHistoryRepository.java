package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.ReservationHistory;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationHistoryRepository extends JpaRepository<ReservationHistory, UUID> {}
