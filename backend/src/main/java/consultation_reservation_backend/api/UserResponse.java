package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.domain.UserRole;
import java.util.UUID;

public record UserResponse(UUID id, UserRole role, String firstName, String lastName, String login, String email) {
    public static UserResponse from(AppUser user) { return new UserResponse(user.getId(), user.getRole(), user.getFirstName(), user.getLastName(), user.getLogin(), user.getEmail()); }
}