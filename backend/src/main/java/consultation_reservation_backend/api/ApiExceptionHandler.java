package consultation_reservation_backend.api;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, String>> handle(ApiException exception) {
    return ResponseEntity.status(exception.getStatus())
        .body(Map.of("message", exception.getMessage()));
  }

  @ExceptionHandler({DataAccessException.class, TransactionException.class})
  ResponseEntity<Map<String, String>> handleDependencyFailure(
      RuntimeException exception, HttpServletRequest request) {
    LOG.error(
        "event=database_operation_failure operation=request path={} failureType={} outcome=http_503",
        request.getRequestURI(),
        exception.getClass().getSimpleName());
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(Map.of("message", "Service temporarily unavailable."));
  }
}
