package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import consultation_reservation_backend.api.ConsultationSlotController;
import consultation_reservation_backend.api.ReservationController;
import consultation_reservation_backend.config.SecurityConfig;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.*;
import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.security.BearerTokenFilter;
import consultation_reservation_backend.service.*;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({ReservationController.class, ConsultationSlotController.class})
@Import({SecurityConfig.class, BearerTokenFilter.class, ReservationService.class})
class ReservationAuthorizationTests {
  @Autowired MockMvc mvc;
  @MockitoBean AuthService auth;
  @MockitoBean UserService users;
  @MockitoBean ReservationRepository reservations;
  @MockitoBean ConsultationSlotRepository slots;
  @MockitoBean ReservationHistoryRepository history;
  @MockitoBean NotificationService notifications;
  @MockitoBean ConsultationSlotService consultationSlots;
  AppUser teacher, student, outsider;
  Reservation reservation;
  UUID token;

  @BeforeEach
  void setup() {
    teacher = user(UserRole.TEACHER, "owner");
    student = user(UserRole.STUDENT, "student");
    outsider = user(UserRole.TEACHER, "other");
    var start = OffsetDateTime.now().plusDays(2);
    reservation =
        new Reservation(
            new ConsultationSlot(teacher, start, start.plusHours(1)),
            student,
            "Consultation",
            "Question");
    when(reservations.findById(reservation.getId())).thenReturn(Optional.of(reservation));
    token = UUID.randomUUID();
  }

  private AppUser user(UserRole role, String name) {
    return new AppUser(role, name, "Test", name, name + "@example.test", "unused");
  }

  private void login(AppUser user, UserRole role) {
    when(auth.authenticate(token)).thenReturn(new AuthenticatedUser(user.getId(), role));
    when(users.get(user.getId())).thenReturn(user);
  }

  private org.springframework.test.web.servlet.ResultActions request(String operation, String body)
      throws Exception {
    return mvc.perform(
        post("/api/reservations/" + reservation.getId() + "/" + operation)
            .header("Authorization", "Bearer " + token)
            .contentType("application/json")
            .content(body));
  }

  private String spoofedId(AppUser user) {
    return "{\"actorUserId\":\"" + user.getId() + "\"}";
  }

  private void unchanged() {
    assertEquals(ReservationStatus.PENDING, reservation.getStatus());
    assertNull(reservation.getConfirmedAt());
    assertNull(reservation.getCancelledAt());
    verifyNoInteractions(history, notifications);
  }

  @Test
  void otherTeacherCannotSpoofOwnerWhenApproving() throws Exception {
    login(outsider, UserRole.TEACHER);
    request("approve", spoofedId(teacher)).andExpect(status().isForbidden());
    unchanged();
    verify(users, never()).get(teacher.getId());
  }

  @Test
  void otherTeacherCannotSpoofOwnerWhenCancelling() throws Exception {
    login(outsider, UserRole.TEACHER);
    request("cancel", spoofedId(teacher)).andExpect(status().isForbidden());
    unchanged();
  }

  @Test
  void otherStudentCannotSpoofReservationStudent() throws Exception {
    var otherStudent = user(UserRole.STUDENT, "otherStudent");
    login(otherStudent, UserRole.STUDENT);
    request("cancel", spoofedId(student)).andExpect(status().isForbidden());
    unchanged();
  }

  @Test
  void studentCannotApprove() throws Exception {
    login(student, UserRole.STUDENT);
    request("approve", spoofedId(teacher)).andExpect(status().isForbidden());
    unchanged();
  }

  @Test
  void ownerApprovesWithoutClientActorId() throws Exception {
    login(teacher, UserRole.TEACHER);
    request("approve", "{}").andExpect(status().isOk());
    assertEquals(ReservationStatus.CONFIRMED, reservation.getStatus());
    assertNotNull(reservation.getConfirmedAt());
    verify(history).save(any(ReservationHistory.class));
    verify(notifications)
        .create(eq(student), eq(reservation), anyString(), anyString(), anyString());
  }

  @Test
  void reservationCreationUsesAuthenticatedStudentInsteadOfBodyStudentId() throws Exception {
    login(student, UserRole.STUDENT);
    var start = OffsetDateTime.now().plusDays(1);
    var slot = new ConsultationSlot(teacher, start, start.plusHours(1));
    when(slots.findById(slot.getId())).thenReturn(Optional.of(slot));
    when(reservations.findBySlotIdAndStatusIn(eq(slot.getId()), anyList()))
        .thenReturn(Optional.empty());
    when(reservations.countByStudentIdAndStatus(eq(student.getId()), any())).thenReturn(0L);
    when(reservations.findOverlappingForStudent(eq(student.getId()), any(), any(), anyList()))
        .thenReturn(java.util.List.of());
    when(reservations.saveAndFlush(any(Reservation.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    mvc.perform(
            post("/api/reservations")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(
                    "{\"slotId\":\""
                        + slot.getId()
                        + "\",\"studentId\":\""
                        + outsider.getId()
                        + "\",\"reasonTitle\":\"Question\",\"reasonDescription\":\"Details\",\"consultationMode\":\"ONLINE\"}"))
        .andExpect(status().isCreated());

    var created = org.mockito.ArgumentCaptor.forClass(Reservation.class);
    verify(reservations).saveAndFlush(created.capture());
    assertEquals(student.getId(), created.getValue().getStudent().getId());
    var historyEntry = org.mockito.ArgumentCaptor.forClass(ReservationHistory.class);
    verify(history).save(historyEntry.capture());
    assertSame(student, ReflectionTestUtils.getField(historyEntry.getValue(), "actor"));
    verify(users).get(student.getId());
    verify(users, never()).get(outsider.getId());
  }

  @Test
  void studentCannotSpoofSlotOwnerWhenCancellingSlotWithReservation() throws Exception {
    login(student, UserRole.STUDENT);
    var slot = reservation.getSlot();
    when(slots.findById(slot.getId())).thenReturn(Optional.of(slot));

    mvc.perform(
            post("/api/slots/" + slot.getId() + "/cancel-with-reservation")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"actorUserId\":\"" + teacher.getId() + "\",\"note\":\"Cancelled\"}"))
        .andExpect(status().isForbidden());

    assertEquals(ReservationStatus.PENDING, reservation.getStatus());
    assertEquals(SlotStatus.ACTIVE, slot.getStatus());
    verifyNoInteractions(history, notifications);
    verify(users, never()).get(teacher.getId());
  }

  @Test
  void teacherCannotSpoofSlotOwnerWhenCancellingOpenSlot() throws Exception {
    login(outsider, UserRole.TEACHER);
    var slot = reservation.getSlot();
    when(slots.findById(slot.getId())).thenReturn(Optional.of(slot));

    mvc.perform(
            post("/api/slots/" + slot.getId() + "/cancel")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"actorUserId\":\"" + teacher.getId() + "\"}"))
        .andExpect(status().isForbidden());

    assertEquals(SlotStatus.ACTIVE, slot.getStatus());
    verify(users).get(outsider.getId());
    verify(users, never()).get(teacher.getId());
    verifyNoInteractions(history, notifications);
  }

  @Test
  void slotOwnerCancelsReservationThroughReservationService() throws Exception {
    login(teacher, UserRole.TEACHER);
    var slot = reservation.getSlot();
    when(slots.findById(slot.getId())).thenReturn(Optional.of(slot));
    when(reservations.findBySlotIdAndStatusIn(eq(slot.getId()), anyList()))
        .thenReturn(Optional.of(reservation));

    mvc.perform(
            post("/api/slots/" + slot.getId() + "/cancel-with-reservation")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"note\":\"Teacher cancelled the slot\"}"))
        .andExpect(status().isNoContent());

    assertEquals(ReservationStatus.CANCELLED, reservation.getStatus());
    assertEquals(SlotStatus.CANCELLED, slot.getStatus());
    var historyEntry = org.mockito.ArgumentCaptor.forClass(ReservationHistory.class);
    verify(history).save(historyEntry.capture());
    assertSame(teacher, ReflectionTestUtils.getField(historyEntry.getValue(), "actor"));
    verify(notifications)
        .create(eq(student), eq(reservation), anyString(), anyString(), anyString());
  }

  @Test
  void ownerCannotApproveTwice() throws Exception {
    login(teacher, UserRole.TEACHER);
    reservation.confirm();
    request("approve", "{}").andExpect(status().isConflict());
    assertEquals(ReservationStatus.CONFIRMED, reservation.getStatus());
    verifyNoInteractions(history, notifications);
  }

  @Test
  void ownerCannotApproveCancelledReservation() throws Exception {
    login(teacher, UserRole.TEACHER);
    reservation.cancel(student, "Cancelled");
    request("approve", "{}").andExpect(status().isConflict());
    assertEquals(ReservationStatus.CANCELLED, reservation.getStatus());
    verifyNoInteractions(history, notifications);
  }

  @Test
  void studentCancelsOwnReservation() throws Exception {
    login(student, UserRole.STUDENT);
    request("cancel", "{\"note\":\"Cannot attend\"}").andExpect(status().isOk());
    assertEquals(ReservationStatus.CANCELLED, reservation.getStatus());
    verify(history).save(any(ReservationHistory.class));
  }

  @Test
  void teacherCancelsOwnSlotReservation() throws Exception {
    login(teacher, UserRole.TEACHER);
    request("cancel", "{}").andExpect(status().isOk());
    assertEquals(ReservationStatus.CANCELLED, reservation.getStatus());
    verify(history).save(any(ReservationHistory.class));
  }

  @Test
  void unauthenticatedRequestIsRejected() throws Exception {
    mvc.perform(
            post("/api/reservations/" + reservation.getId() + "/approve")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().is4xxClientError());
    unchanged();
    verifyNoInteractions(reservations);
  }
}
