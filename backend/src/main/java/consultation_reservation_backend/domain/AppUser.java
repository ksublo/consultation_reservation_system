package consultation_reservation_backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id private UUID id;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Set<UserRole> roles = new HashSet<>();
    @Column(nullable = false) private String firstName;
    @Column(nullable = false) private String lastName;
    @Column(nullable = false, unique = true) private String login;
    @Column(nullable = false, unique = true) private String email;
    @Column(nullable = false) private String passwordHash;
    @Column(nullable = false) private OffsetDateTime createdAt;

    protected AppUser() { }
    public AppUser(UserRole role, String firstName, String lastName, String login, String email, String passwordHash) {
        this.id = UUID.randomUUID(); this.roles.add(role); this.firstName = firstName; this.lastName = lastName;
        this.login = login; this.email = email; this.passwordHash = passwordHash; this.createdAt = OffsetDateTime.now();
    }
    public UUID getId() { return id; }
    public Set<UserRole> getRoles() { return Set.copyOf(roles); }
    public boolean hasRole(UserRole role) { return roles.contains(role); }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getLogin() { return login; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
}