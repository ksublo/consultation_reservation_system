package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.security.BearerTokenFilter;
import consultation_reservation_backend.service.AuthService;
import jakarta.servlet.FilterChain;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.transaction.CannotCreateTransactionException;

class BearerTokenFilterTests {
  @Test
  void databaseFailureDuringAuthenticationReturnsServiceUnavailable() throws Exception {
    AuthService auth =
        new AuthService(null, null) {
          @Override
          public AuthenticatedUser authenticate(UUID token) {
            throw new CannotCreateTransactionException("database unavailable");
          }
        };
    var chainInvoked = new AtomicBoolean();
    FilterChain chain = (request, response) -> chainInvoked.set(true);
    var request = new MockHttpServletRequest("GET", "/api/slots");
    request.addHeader("Authorization", "Bearer 00000000-0000-0000-0000-000000000001");
    var response = new MockHttpServletResponse();
    new BearerTokenFilter(auth).doFilter(request, response, chain);

    assertEquals(503, response.getStatus());
    assertEquals("application/json", response.getContentType());
    assertEquals(
        "{\"message\":\"Service temporarily unavailable.\"}", response.getContentAsString());
    assertFalse(chainInvoked.get());
  }
}
