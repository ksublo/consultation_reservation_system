package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.domain.UserRole;
import java.util.Set;
import java.util.UUID;

public record UserResponse(UUID id, Set<UserRole> roles, String firstName, String lastName, String login, String email) {
    public static UserResponse from(AppUser user) { return new UserResponse(user.getId(), user.getRoles(), user.getFirstName(), user.getLastName(), user.getLogin(), user.getEmail()); }
}