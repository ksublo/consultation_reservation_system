package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.UserRole;
import java.util.Set;
import java.util.UUID;

public record LoginResponse(
    String token,
    UUID userId,
    String login,
    String firstName,
    String lastName,
    Set<UserRole> roles,
    UserRole activeRole) {}
