package consultation_reservation_backend.api;

import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.service.ReservationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
  private final ReservationService reservations;

  public ReservationController(ReservationService reservations) {
    this.reservations = reservations;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ReservationResponse create(@Valid @RequestBody CreateReservationRequest request) {
    return reservations.create(request);
  }

  @PostMapping("/{reservationId}/approve")
  public ReservationResponse approve(
      @PathVariable UUID reservationId,
      @AuthenticationPrincipal AuthenticatedUser actor,
      @Valid @RequestBody ReservationTransitionRequest request) {
    return reservations.approve(reservationId, actor, request);
  }

  @PostMapping("/{reservationId}/cancel")
  public ReservationResponse cancel(
      @PathVariable UUID reservationId,
      @AuthenticationPrincipal AuthenticatedUser actor,
      @Valid @RequestBody ReservationTransitionRequest request) {
    return reservations.cancel(reservationId, actor, request);
  }

  @GetMapping
  public List<ReservationResponse> mine(@RequestParam UUID userId) {
    return reservations.forUser(userId);
  }
}
