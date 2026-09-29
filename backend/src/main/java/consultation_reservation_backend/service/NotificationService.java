package consultation_reservation_backend.service;
import consultation_reservation_backend.api.NotificationResponse;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.NotificationRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class NotificationService {
    private final NotificationRepository notifications;
    public NotificationService(NotificationRepository notifications) { this.notifications = notifications; }
    public void create(AppUser recipient, Reservation reservation, String type, String title, String message) { notifications.save(new Notification(recipient, reservation, type, title, message)); }
    @Transactional(readOnly = true) public List<NotificationResponse> list(UUID userId) { return notifications.findByRecipientIdAndReadAtIsNullOrderByCreatedAtDesc(userId).stream().map(NotificationResponse::from).toList(); }
    @Transactional public void markRead(UUID userId, UUID notificationId) { notifications.findByIdAndRecipientId(notificationId, userId).ifPresent(Notification::markRead); }
}
