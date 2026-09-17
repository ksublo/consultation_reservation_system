package consultation_reservation_backend.api;

import consultation_reservation_backend.service.ConsultationSlotService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/slots")
public class ConsultationSlotController {
    private final ConsultationSlotService slots;
    public ConsultationSlotController(ConsultationSlotService slots) { this.slots = slots; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public SlotResponse create(@Valid @RequestBody CreateSlotRequest request) { return slots.create(request); }
    @GetMapping public List<SlotResponse> available(@RequestParam(required = false) OffsetDateTime from) { return slots.available(from); }
    @GetMapping("/mine") public List<SlotResponse> mine(@RequestParam UUID teacherId) { return slots.forTeacher(teacherId); }
    @PostMapping("/{slotId}/cancel") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable UUID slotId, @Valid @RequestBody ActorRequest request) { slots.cancel(slotId, request.actorUserId()); }
}
