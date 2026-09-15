package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(
        @NotNull UserRole role,
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank String login,
        @NotBlank @Email String email,
        @NotBlank String password
) { }
