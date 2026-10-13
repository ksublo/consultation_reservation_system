package consultation_reservation_backend.api;

import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateSlotRequest(
    @NotNull UUID teacherId,
    @NotNull OffsetDateTime startsAt,
    @NotNull OffsetDateTime endsAt,
    Boolean onlineAvailable,
    Boolean offlineAvailable) {
  public boolean allowsOnline() {
    return onlineAvailable == null || onlineAvailable;
  }

  public boolean allowsOffline() {
    return offlineAvailable == null || offlineAvailable;
  }
}
