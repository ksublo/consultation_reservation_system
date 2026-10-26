package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.ConsultationSlotRepository;
import java.time.Duration;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ConsultationSlotService {
  private static final int RESERVATION_CUTOFF_HOURS = 3;
  private static final LocalTime WORKDAY_START = LocalTime.of(7, 15);
  private static final LocalTime WORKDAY_END = LocalTime.of(19, 15);
  private static final ZoneId CONSULTATION_TIME_ZONE = ZoneId.of("Europe/Prague");
  private static final List<Long> ALLOWED_DURATIONS = List.of(15L, 30L, 45L, 60L, 90L);
  private final ConsultationSlotRepository slots;
  private final UserService users;

  public ConsultationSlotService(ConsultationSlotRepository slots, UserService users) {
    this.slots = slots;
    this.users = users;
  }

  public SlotResponse create(CreateSlotRequest request) {
    if (!request.allowsOnline() && !request.allowsOffline())
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "A slot must allow online or in-person consultations.");
    if (!request.endsAt().isAfter(request.startsAt()))
      throw new ApiException(HttpStatus.BAD_REQUEST, "Slot end must be after its start.");
    if (!request.startsAt().isAfter(OffsetDateTime.now()))
      throw new ApiException(HttpStatus.BAD_REQUEST, "A slot must start in the future.");
    validateDuration(request);
    validateWorkingHours(request);
    AppUser teacher = users.get(request.teacherId());
    if (!teacher.hasRole(UserRole.TEACHER))
      throw new ApiException(HttpStatus.FORBIDDEN, "Only a teacher can create slots.");
    try {
      return SlotResponse.from(
          slots.saveAndFlush(
              new ConsultationSlot(
                  teacher,
                  request.startsAt(),
                  request.endsAt(),
                  request.allowsOnline(),
                  request.allowsOffline())));
    } catch (DataIntegrityViolationException exception) {
      throw new ApiException(
          HttpStatus.CONFLICT, "This slot overlaps another active slot of the teacher.");
    }
  }

  @Transactional(readOnly = true)
  public List<SlotResponse> forTeacher(UUID teacherId) {
    return slots
        .findByTeacher_IdAndStartsAtGreaterThanEqualOrderByStartsAt(teacherId, OffsetDateTime.now())
        .stream()
        .map(SlotResponse::from)
        .toList();
  }

  public List<SlotResponse> available(OffsetDateTime from) {
    OffsetDateTime earliestStart = OffsetDateTime.now().plusHours(RESERVATION_CUTOFF_HOURS);
    if (from != null && from.isAfter(earliestStart)) earliestStart = from;
    return slots
        .findAvailable(
            SlotStatus.ACTIVE,
            earliestStart,
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED))
        .stream()
        .map(SlotResponse::from)
        .toList();
  }

  private void validateDuration(CreateSlotRequest request) {
    long minutes = Duration.between(request.startsAt(), request.endsAt()).toMinutes();
    if (!ALLOWED_DURATIONS.contains(minutes))
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "Consultation duration must be 15, 30, 45, 60, or 90 minutes.");
  }

  private void validateWorkingHours(CreateSlotRequest request) {
    var startsAt = request.startsAt().atZoneSameInstant(CONSULTATION_TIME_ZONE);
    var endsAt = request.endsAt().atZoneSameInstant(CONSULTATION_TIME_ZONE);
    if (startsAt.getDayOfWeek().getValue() > 5 || endsAt.getDayOfWeek().getValue() > 5)
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "Consultations can be created only Monday to Friday.");
    LocalTime start = startsAt.toLocalTime();
    LocalTime end = endsAt.toLocalTime();
    if (start.isBefore(WORKDAY_START) || end.isAfter(WORKDAY_END))
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "Consultations must be within working hours 07:15-19:15.");
  }
}
