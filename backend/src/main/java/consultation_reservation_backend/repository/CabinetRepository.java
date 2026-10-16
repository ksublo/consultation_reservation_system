package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.Cabinet;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CabinetRepository extends JpaRepository<Cabinet, UUID> {}
