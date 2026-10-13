package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.domain.UserRole;
import java.util.Set;
import java.util.UUID;

public record UserResponse(
    UUID id,
    Set<UserRole> roles,
    String firstName,
    String lastName,
    String login,
    String email,
    UUID cabinetId,
    String cabinet) {
  public static UserResponse from(AppUser user) {
    return new UserResponse(
        user.getId(),
        user.getRoles(),
        user.getFirstName(),
        user.getLastName(),
        user.getLogin(),
        user.getEmail(),
        user.getCabinet() == null ? null : user.getCabinet().getId(),
        user.getCabinet() == null ? null : user.getCabinet().getName());
  }
}
