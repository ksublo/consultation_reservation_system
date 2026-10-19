package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.*;
import consultation_reservation_backend.security.AuthenticatedUser;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {
  private final AppUserRepository users;
  private final AuthSessionRepository sessions;
  private final PasswordEncoder passwordEncoder;

  public AuthService(
      AppUserRepository users, AuthSessionRepository sessions, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.sessions = sessions;
    this.passwordEncoder = passwordEncoder;
  }

  public LoginResponse login(LoginRequest request) {
    AppUser user =
        users
            .findByLoginIgnoreCase(request.login())
            .orElseThrow(
                () -> new ApiException(HttpStatus.UNAUTHORIZED, "Neplatný login nebo heslo."));
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash()))
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Neplatný login nebo heslo.");
    if (!user.hasRole(request.role()))
      throw new ApiException(HttpStatus.FORBIDDEN, "Tento účet nemá zvolenou roli.");
    AuthSession session = sessions.save(new AuthSession(user, request.role()));
    return new LoginResponse(
        session.getId().toString(),
        user.getId(),
        user.getLogin(),
        user.getFirstName(),
        user.getLastName(),
        user.getRoles(),
        request.role());
  }

  @Transactional(readOnly = true)
  public AuthenticatedUser authenticate(UUID token) {
    AuthSession session = sessions.findById(token).orElse(null);
    if (session == null || session.isExpired()) return null;
    return new AuthenticatedUser(session.getUser().getId(), session.getActiveRole());
  }

  public void logout(UUID token) {
    sessions.deleteById(token);
  }
}
