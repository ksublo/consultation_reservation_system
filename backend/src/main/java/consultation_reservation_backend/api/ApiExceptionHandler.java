package consultation_reservation_backend.api;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, String>> handle(ApiException exception) {
    return ResponseEntity.status(exception.getStatus())
        .body(Map.of("message", exception.getMessage()));
  }
}
