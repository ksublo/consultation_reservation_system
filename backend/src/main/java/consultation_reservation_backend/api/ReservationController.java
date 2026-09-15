package consultation_reservation_backend.api;

import consultation_reservation_backend.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
    private final ReservationService reservations;
    public ReservationController(ReservationService reservations) { this.reservations = reservations; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponse create(@Valid @RequestBody CreateReservationRequest request) { return reservations.create(request); }
    @PostMapping("/{reservationId}/approve")
    public ReservationResponse approve(@PathVariable UUID reservationId, @Valid @RequestBody ActorRequest request) { return reservations.approve(reservationId, request); }
    @PostMapping("/{reservationId}/cancel")
    public ReservationResponse cancel(@PathVariable UUID reservationId, @Valid @RequestBody ActorRequest request) { return reservations.cancel(reservationId, request); }
    @GetMapping public List<ReservationResponse> mine(@RequestParam UUID userId) { return reservations.forUser(userId); }
}
