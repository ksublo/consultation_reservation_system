package consultation_reservation_backend.repository;

import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByLoginIgnoreCase(String login);
    List<AppUser> findDistinctByRolesContainingOrderByLastNameAscFirstNameAsc(UserRole role);
}
