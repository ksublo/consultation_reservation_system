package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> { }
