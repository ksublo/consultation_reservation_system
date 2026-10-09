package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.domain.UserRole;
import consultation_reservation_backend.repository.AppUserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {
  private final AppUserRepository users;
  private final PasswordEncoder passwordEncoder;

  public UserService(AppUserRepository users, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
  }

  public UserResponse create(CreateUserRequest request) {
    AppUser user =
        users.save(
            new AppUser(
                request.role(),
                request.firstName(),
                request.lastName(),
                request.login(),
                request.email(),
                passwordEncoder.encode(request.password())));
    return UserResponse.from(user);
  }

  public AppUser get(UUID id) {
    return users
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
  }

  @Transactional(readOnly = true)
  public List<UserResponse> teachers() {
    return users
        .findDistinctByRolesContainingOrderByLastNameAscFirstNameAsc(UserRole.TEACHER)
        .stream()
        .map(UserResponse::from)
        .toList();
  }
}
