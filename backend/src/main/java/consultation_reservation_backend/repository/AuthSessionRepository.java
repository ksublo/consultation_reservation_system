package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> { }
