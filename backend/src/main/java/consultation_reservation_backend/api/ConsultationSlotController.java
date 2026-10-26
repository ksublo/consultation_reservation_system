package consultation_reservation_backend.api;

import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.service.ConsultationSlotService;
import consultation_reservation_backend.service.ReservationService;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/slots")
public class ConsultationSlotController {
  private final ConsultationSlotService slots;
  private final ReservationService reservations;

  public ConsultationSlotController(
      ConsultationSlotService slots, ReservationService reservations) {
    this.slots = slots;
    this.reservations = reservations;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public SlotResponse create(@Valid @RequestBody CreateSlotRequest request) {
    return slots.create(request);
  }

  @GetMapping
  public List<SlotResponse> available(@RequestParam(required = false) OffsetDateTime from) {
    return slots.available(from);
  }

  @GetMapping("/mine")
  public List<SlotResponse> mine(@RequestParam UUID teacherId) {
    return slots.forTeacher(teacherId);
  }

  @PostMapping("/{slotId}/cancel")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void cancel(@PathVariable UUID slotId, @AuthenticationPrincipal AuthenticatedUser actor) {
    reservations.cancelSlot(slotId, actor);
  }

  @PostMapping("/{slotId}/cancel-with-reservation")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void cancelWithReservation(
      @PathVariable UUID slotId,
      @AuthenticationPrincipal AuthenticatedUser actor,
      @Valid @RequestBody ReservationTransitionRequest request) {
    reservations.cancelSlotWithReservation(slotId, actor, request);
  }
}
