package consultation_reservation_backend.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Older clients may send actorUserId; it never determines the authenticated actor.
@JsonIgnoreProperties(ignoreUnknown = true)
public record ReservationTransitionRequest(String note) { }
