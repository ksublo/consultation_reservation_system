package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.ConsultationMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateReservationRequest(
    @NotNull UUID slotId,
    @NotNull UUID studentId,
    @NotBlank String reasonTitle,
    @NotBlank String reasonDescription,
    @NotNull ConsultationMode consultationMode) {}
