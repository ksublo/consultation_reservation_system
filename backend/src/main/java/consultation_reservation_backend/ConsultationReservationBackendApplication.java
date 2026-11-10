package consultation_reservation_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ConsultationReservationBackendApplication {
  public static void main(String[] args) {
    SpringApplication.run(ConsultationReservationBackendApplication.class, args);
  }
}
