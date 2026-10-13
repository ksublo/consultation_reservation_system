package consultation_reservation_backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "cabinets")
public class Cabinet {
  @Id private UUID id;

  @Column(nullable = false, unique = true, length = 50)
  private String name;

  protected Cabinet() {}

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }
}
