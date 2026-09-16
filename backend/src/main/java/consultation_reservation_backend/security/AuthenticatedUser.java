package consultation_reservation_backend.security;

import consultation_reservation_backend.domain.UserRole;
import java.util.UUID;

public record AuthenticatedUser(UUID id, UserRole activeRole) { }
