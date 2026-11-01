package consultation_reservation_backend.api;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.domain.UserRole;
import consultation_reservation_backend.repository.AppUserRepository;
import consultation_reservation_backend.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.nio.ByteBuffer;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.webauthn.api.AuthenticatorAssertionResponse;
import org.springframework.security.web.webauthn.api.AuthenticatorAttestationResponse;
import org.springframework.security.web.webauthn.api.AuthenticatorResponse;
import org.springframework.security.web.webauthn.api.Bytes;
import org.springframework.security.web.webauthn.api.ImmutablePublicKeyCredentialUserEntity;
import org.springframework.security.web.webauthn.api.PublicKeyCredential;
import org.springframework.security.web.webauthn.api.PublicKeyCredentialCreationOptions;
import org.springframework.security.web.webauthn.api.PublicKeyCredentialRequestOptions;
import org.springframework.security.web.webauthn.api.PublicKeyCredentialUserEntity;
import org.springframework.security.web.webauthn.management.ImmutablePublicKeyCredentialCreationOptionsRequest;
import org.springframework.security.web.webauthn.management.ImmutablePublicKeyCredentialRequestOptionsRequest;
import org.springframework.security.web.webauthn.management.ImmutableRelyingPartyRegistrationRequest;
import org.springframework.security.web.webauthn.management.PublicKeyCredentialUserEntityRepository;
import org.springframework.security.web.webauthn.management.RelyingPartyAuthenticationRequest;
import org.springframework.security.web.webauthn.management.RelyingPartyPublicKey;
import org.springframework.security.web.webauthn.management.UserCredentialRepository;
import org.springframework.security.web.webauthn.management.WebAuthnRelyingPartyOperations;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private static final long FLOW_LIFETIME_SECONDS = 300;
  private static final int MAX_PENDING_CEREMONIES = 1000;

  private final AuthService auth;
  private final AppUserRepository users;
  private final UserCredentialRepository credentials;
  private final PublicKeyCredentialUserEntityRepository userEntities;
  private final WebAuthnRelyingPartyOperations relyingParty;
  private final ObjectMapper mapper;
  private final ConcurrentHashMap<String, RegistrationFlow> registrationFlows =
      new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, AuthenticationFlow> authenticationFlows =
      new ConcurrentHashMap<>();

  public AuthController(
      AuthService auth,
      AppUserRepository users,
      UserCredentialRepository credentials,
      PublicKeyCredentialUserEntityRepository userEntities,
      WebAuthnRelyingPartyOperations relyingParty,
      ObjectMapper mapper) {
    this.auth = auth;
    this.users = users;
    this.credentials = credentials;
    this.userEntities = userEntities;
    this.relyingParty = relyingParty;
    this.mapper = mapper;
  }

  @PostMapping("/password/login")
  public LoginResponse authenticatePassword(@Valid @RequestBody LoginRequest request) {
    AppUser user = findUser(request.login());
    return auth.loginWithPassword(user, request.password(), request.role());
  }

  @PostMapping("/passkey/register/options")
  public CeremonyOptions registrationOptions(@Valid @RequestBody LoginRequest request) {
    expireOldFlows();
    if (registrationFlows.size() + authenticationFlows.size() >= MAX_PENDING_CEREMONIES)
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Zkuste přihlášení za chvíli znovu.");
    AppUser user = findUser(request.login());
    if (!auth.matchesPassword(user, request.password())) throw invalidLogin();
    if (!user.hasRole(request.role()))
      throw new ApiException(HttpStatus.FORBIDDEN, "Tento účet nemá zvolenou roli.");
    Bytes userId = userId(user);
    if (!credentials.findByUserId(userId).isEmpty())
      throw new ApiException(HttpStatus.CONFLICT, "Tento účet už passkey má. Přihlaste se jí.");

    PublicKeyCredentialUserEntity entity =
        ImmutablePublicKeyCredentialUserEntity.builder()
            .id(userId)
            .name(user.getLogin())
            .displayName(user.getFirstName() + " " + user.getLastName())
            .build();
    if (userEntities.findById(userId) == null) userEntities.save(entity);
    var authentication =
        new UsernamePasswordAuthenticationToken(
            user.getLogin(), "passkey-setup", authorities(request.role()));
    var options =
        relyingParty.createPublicKeyCredentialCreationOptions(
            new ImmutablePublicKeyCredentialCreationOptionsRequest(authentication));
    String flowId = UUID.randomUUID().toString();
    registrationFlows.put(
        flowId, new RegistrationFlow(user.getId(), request.role(), options, Instant.now()));
    return new CeremonyOptions(flowId, options);
  }

  @PostMapping("/passkey/register/verify")
  public LoginResponse registerPasskey(@Valid @RequestBody CredentialSubmission submission) {
    RegistrationFlow flow = registrationFlows.remove(submission.flowId());
    if (flow == null || expired(flow.createdAt())) throw expiredCeremony();
    AppUser user = users.findById(flow.userId()).orElseThrow(this::invalidLogin);
    try {
      PublicKeyCredential<AuthenticatorAttestationResponse> credential =
          readCredential(submission.credential(), AuthenticatorAttestationResponse.class);
      String submittedLabel = submission.label() == null ? "" : submission.label().trim();
      String label = submittedLabel.isEmpty() ? "This device" : submittedLabel.substring(0, Math.min(120, submittedLabel.length()));
      relyingParty.registerCredential(
          new ImmutableRelyingPartyRegistrationRequest(
              flow.options(), new RelyingPartyPublicKey(credential, label)));
    } catch (Exception exception) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Registraci passkey se nepodařilo ověřit.");
    }
    return auth.loginWithPasskey(user, flow.role());
  }

  @PostMapping("/passkey/login/options")
  public CeremonyOptions authenticationOptions(@Valid @RequestBody PasskeyLoginRequest request) {
    expireOldFlows();
    if (registrationFlows.size() + authenticationFlows.size() >= MAX_PENDING_CEREMONIES)
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Zkuste přihlášení za chvíli znovu.");
    AppUser user = findUser(request.login());
    if (!user.hasRole(request.role()))
      throw new ApiException(HttpStatus.FORBIDDEN, "Tento účet nemá zvolenou roli.");
    if (credentials.findByUserId(userId(user)).isEmpty())
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Nejdřív si pro účet založte passkey.");

    var authentication =
        new UsernamePasswordAuthenticationToken(
            user.getLogin(), "passkey-login", authorities(request.role()));
    var options =
        relyingParty.createCredentialRequestOptions(
            new ImmutablePublicKeyCredentialRequestOptionsRequest(authentication));
    String flowId = UUID.randomUUID().toString();
    authenticationFlows.put(
        flowId, new AuthenticationFlow(user.getId(), request.role(), options, Instant.now()));
    return new CeremonyOptions(flowId, options);
  }

  @PostMapping("/passkey/login/verify")
  public LoginResponse authenticatePasskey(@Valid @RequestBody CredentialSubmission submission) {
    AuthenticationFlow flow = authenticationFlows.remove(submission.flowId());
    if (flow == null || expired(flow.createdAt())) throw expiredCeremony();
    try {
      PublicKeyCredential<AuthenticatorAssertionResponse> credential =
          readCredential(submission.credential(), AuthenticatorAssertionResponse.class);
      PublicKeyCredentialUserEntity verified =
          relyingParty.authenticate(
              new RelyingPartyAuthenticationRequest(flow.options(), credential));
      AppUser user = users.findByLoginIgnoreCase(verified.getName()).orElseThrow(this::invalidLogin);
      if (!user.getId().equals(flow.userId())) throw invalidLogin();
      return auth.loginWithPasskey(user, flow.role());
    } catch (ApiException exception) {
      throw exception;
    } catch (Exception exception) {
      throw invalidLogin();
    }
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(@RequestHeader("Authorization") String authorization) {
    auth.logout(UUID.fromString(authorization.substring(7)));
  }

  private AppUser findUser(String login) {
    return users.findByLoginIgnoreCase(login).orElseThrow(this::invalidLogin);
  }

  private <T extends AuthenticatorResponse> PublicKeyCredential<T> readCredential(
      JsonNode credential, Class<T> responseType) {
    JavaType type =
        mapper.getTypeFactory().constructParametricType(PublicKeyCredential.class, responseType);
    return mapper.convertValue(credential, type);
  }

  private Bytes userId(AppUser user) {
    UUID id = user.getId();
    return new Bytes(
        ByteBuffer.allocate(16)
            .putLong(id.getMostSignificantBits())
            .putLong(id.getLeastSignificantBits())
            .array());
  }

  private List<SimpleGrantedAuthority> authorities(UserRole role) {
    return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
  }

  private void expireOldFlows() {
    Instant cutoff = Instant.now().minusSeconds(FLOW_LIFETIME_SECONDS);
    registrationFlows.entrySet().removeIf(entry -> entry.getValue().createdAt().isBefore(cutoff));
    authenticationFlows.entrySet().removeIf(entry -> entry.getValue().createdAt().isBefore(cutoff));
  }

  private boolean expired(Instant createdAt) {
    return createdAt.isBefore(Instant.now().minusSeconds(FLOW_LIFETIME_SECONDS));
  }

  private ApiException invalidLogin() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Neplatný login nebo ověření passkey.");
  }

  private ApiException expiredCeremony() {
    return new ApiException(
        HttpStatus.UNAUTHORIZED, "Platnost ověření vypršela. Zkuste to znovu.");
  }

  private record CeremonyOptions(String flowId, Object options) {}

  private record CredentialSubmission(
      @NotBlank String flowId, String label, @NotNull JsonNode credential) {}

  private record PasskeyLoginRequest(
      @NotBlank
          @Size(max = 7, message = "Login nesmí být delší než 7 znaků.")
          @Pattern(regexp = "(?i)^[a-z]{3}[0-9]{4}$", message = "Login musí mít formát ABC1234.")
          String login,
      @NotNull UserRole role) {}

  private record RegistrationFlow(
      UUID userId,
      UserRole role,
      PublicKeyCredentialCreationOptions options,
      Instant createdAt) {}

  private record AuthenticationFlow(
      UUID userId,
      UserRole role,
      PublicKeyCredentialRequestOptions options, Instant createdAt) {}
}
