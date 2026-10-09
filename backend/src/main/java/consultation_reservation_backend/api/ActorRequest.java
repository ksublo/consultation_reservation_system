package consultation_reservation_backend.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ActorRequest(@NotNull UUID actorUserId, String note) {}
