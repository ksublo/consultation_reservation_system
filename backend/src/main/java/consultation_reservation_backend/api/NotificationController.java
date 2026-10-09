package consultation_reservation_backend.api;

import consultation_reservation_backend.service.NotificationService;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationService notifications;

  public NotificationController(NotificationService notifications) {
    this.notifications = notifications;
  }

  @GetMapping
  public List<NotificationResponse> list(@RequestParam UUID userId) {
    return notifications.list(userId);
  }

  @PostMapping("/{notificationId}/read")
  public void markRead(@PathVariable UUID notificationId, @RequestParam UUID userId) {
    notifications.markRead(userId, notificationId);
  }
}
