package consultation_reservation_backend.config;

import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.security.web.webauthn.api.PublicKeyCredentialRpEntity;
import org.springframework.security.web.webauthn.jackson.WebauthnJackson2Module;
import org.springframework.security.web.webauthn.management.JdbcPublicKeyCredentialUserEntityRepository;
import org.springframework.security.web.webauthn.management.JdbcUserCredentialRepository;
import org.springframework.security.web.webauthn.management.PublicKeyCredentialUserEntityRepository;
import org.springframework.security.web.webauthn.management.UserCredentialRepository;
import org.springframework.security.web.webauthn.management.WebAuthnRelyingPartyOperations;
import org.springframework.security.web.webauthn.management.Webauthn4JRelyingPartyOperations;

@Configuration
public class WebAuthnConfig {
  @Bean
  PublicKeyCredentialUserEntityRepository userEntityRepository(JdbcOperations jdbc) {
    return new JdbcPublicKeyCredentialUserEntityRepository(jdbc);
  }

  @Bean
  UserCredentialRepository userCredentialRepository(JdbcOperations jdbc) {
    return new JdbcUserCredentialRepository(jdbc);
  }

  @Bean
  WebAuthnRelyingPartyOperations webAuthnRelyingPartyOperations(
      PublicKeyCredentialUserEntityRepository entities,
      UserCredentialRepository credentials,
      @Value("${app.webauthn.rp-id:localhost}") String rpId,
      @Value("${app.webauthn.allowed-origin:http://localhost:5173}") String origin) {
    PublicKeyCredentialRpEntity rp =
        PublicKeyCredentialRpEntity.builder().name("Consultation Reservations").id(rpId).build();
    return new Webauthn4JRelyingPartyOperations(entities, credentials, rp, Set.of(origin));
  }

  @Bean
  WebauthnJackson2Module webauthnJackson2Module() {
    return new WebauthnJackson2Module();
  }
}
