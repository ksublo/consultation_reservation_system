package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record LoginRequest(@NotBlank @Pattern(regexp = "(?i)^[a-z]{3}[0-9]{4}$", message = "Login musí mít formát ABC1234.") String login, @NotBlank String password, @NotNull UserRole role) { }
