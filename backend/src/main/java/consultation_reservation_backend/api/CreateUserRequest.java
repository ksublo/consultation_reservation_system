package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateUserRequest(
        @NotNull UserRole role,
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Pattern(regexp = "(?i)^$|^[a-z]{3}[0-9]{4}$", message = "Login musí mít formát ABC1234.")
        String login,
        @NotBlank @Email String email,
        @NotBlank String password
) { }
