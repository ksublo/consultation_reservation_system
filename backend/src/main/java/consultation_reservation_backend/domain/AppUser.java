package consultation_reservation_backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    private UUID id;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private UserRole role;
    @Column(nullable = false) private String firstName;
    @Column(nullable = false) private String lastName;
    @Column(nullable = false, unique = true) private String login;
    @Column(nullable = false, unique = true) private String email;
    @Column(nullable = false) private String passwordHash;
    @Column(nullable = false) private OffsetDateTime createdAt;

    protected AppUser() { }

    public AppUser(UserRole role, String firstName, String lastName, String login, String email, String passwordHash) {
        this.id = UUID.randomUUID(); this.role = role; this.firstName = firstName; this.lastName = lastName;
        this.login = login; this.email = email; this.passwordHash = passwordHash; this.createdAt = OffsetDateTime.now();
    }
    public UUID getId() { return id; }
    public UserRole getRole() { return role; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getLogin() { return login; }
    public String getEmail() { return email; }
}
