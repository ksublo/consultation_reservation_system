package consultation_reservation_backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/consultation_reservation",
        "spring.datasource.username=consultation_reservation",
        "spring.datasource.password=change-me"
})
class ConsultationReservationBackendApplicationTests {

    @Test
    void contextLoads() {
    }
}