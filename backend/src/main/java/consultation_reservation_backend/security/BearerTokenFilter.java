package consultation_reservation_backend.security;

import consultation_reservation_backend.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionException;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class BearerTokenFilter extends OncePerRequestFilter {
  private static final Logger LOG = LoggerFactory.getLogger(BearerTokenFilter.class);
  private final AuthService auth;

  public BearerTokenFilter(AuthService auth) {
    this.auth = auth;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        AuthenticatedUser user = auth.authenticate(UUID.fromString(header.substring(7)));
        if (user != null)
          SecurityContextHolder.getContext()
              .setAuthentication(
                  new UsernamePasswordAuthenticationToken(
                      user,
                      null,
                      List.of(new SimpleGrantedAuthority("ROLE_" + user.activeRole().name()))));
      } catch (IllegalArgumentException ignored) {
      } catch (DataAccessException | TransactionException exception) {
        LOG.error(
            "event=authentication_dependency_failure operation=authenticate path={} failureType={} outcome=http_503",
            request.getRequestURI(),
            exception.getClass().getSimpleName());
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"Service temporarily unavailable.\"}");
        return;
      }
    }
    filterChain.doFilter(request, response);
  }
}
