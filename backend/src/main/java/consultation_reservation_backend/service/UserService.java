package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Transactional
public class UserService {
    private static final Pattern LOGIN_PATTERN = Pattern.compile("(?i)^[a-z]{3}[0-9]{4}$");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    public UserService(AppUserRepository users, PasswordEncoder passwordEncoder) { this.users = users; this.passwordEncoder = passwordEncoder; }
    public UserResponse create(CreateUserRequest request) {
        String login = resolveLogin(request);
        AppUser user = users.save(new AppUser(request.role(), request.firstName(), request.lastName(), login, request.email(), passwordEncoder.encode(request.password())));
        return UserResponse.from(user);
    }
    public AppUser get(UUID id) { return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found.")); }

    private String resolveLogin(CreateUserRequest request) {
        if (request.login() != null && !request.login().isBlank()) {
            String login = request.login().trim().toUpperCase(Locale.ROOT);
            if (!LOGIN_PATTERN.matcher(login).matches()) throw new ApiException(HttpStatus.BAD_REQUEST, "Login musí mít formát ABC1234.");
            if (users.existsByLoginIgnoreCase(login)) throw new ApiException(HttpStatus.CONFLICT, "Login už existuje.");
            return login;
        }

        String prefix = surnamePrefix(request.lastName());
        for (int number = 1; number <= 9999; number++) {
            String login = "%s%04d".formatted(prefix, number);
            if (!users.existsByLoginIgnoreCase(login)) return login;
        }
        throw new ApiException(HttpStatus.CONFLICT, "Pro zadané příjmení už nejsou dostupné loginy.");
    }

    private String surnamePrefix(String lastName) {
        String normalized = Normalizer.normalize(lastName, Normalizer.Form.NFD);
        String letters = DIACRITICS.matcher(normalized).replaceAll("")
                .replaceAll("[^A-Za-z]", "")
                .toUpperCase(Locale.ROOT);
        if (letters.length() >= 3) return letters.substring(0, 3);
        return (letters + "XXX").substring(0, 3);
    }
}
