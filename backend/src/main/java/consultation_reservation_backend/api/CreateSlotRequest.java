package consultation_reservation_backend.api;

import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateSlotRequest(
    @NotNull UUID teacherId, @NotNull OffsetDateTime startsAt, @NotNull OffsetDateTime endsAt) {}
