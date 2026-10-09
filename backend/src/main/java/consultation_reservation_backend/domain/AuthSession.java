package consultation_reservation_backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "auth_sessions")
public class AuthSession {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserRole activeRole;

  @Column(nullable = false)
  private OffsetDateTime expiresAt;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected AuthSession() {}

  public AuthSession(AppUser user, UserRole activeRole) {
    this.id = UUID.randomUUID();
    this.user = user;
    this.activeRole = activeRole;
    this.createdAt = OffsetDateTime.now();
    this.expiresAt = createdAt.plusHours(8);
  }

  public UUID getId() {
    return id;
  }

  public AppUser getUser() {
    return user;
  }

  public UserRole getActiveRole() {
    return activeRole;
  }

  public boolean isExpired() {
    return expiresAt.isBefore(OffsetDateTime.now());
  }
}
