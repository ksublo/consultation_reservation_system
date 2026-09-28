package consultation_reservation_backend.repository;
import consultation_reservation_backend.domain.Notification;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientIdAndReadAtIsNullOrderByCreatedAtDesc(UUID recipientId);
    Optional<Notification> findByIdAndRecipientId(UUID id, UUID recipientId);
}
