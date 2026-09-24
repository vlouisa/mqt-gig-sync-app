/**
 * Audit entry voor flight-acties.
 */
class FlightAuditEntry extends BaseAuditEntry {
  /**
   * @param {Object} params Audit parameters.
   * @param {Object} params.record Flight-record.
   */
  constructor(params) {
    super(params);
    this.record = params.record || {};
  }

  /**
   * @returns {string} Entity type.
   */
  getEntityType() {
    return 'flight';
  }

  /**
   * @returns {string} Flight ID.
   */
  getEntityId() {
    return this.record[CONFIG.entities.flight.columns.flightId] || '';
  }

  /**
   * @returns {string} Route als vertrekcode -> aankomstcode.
   */
  getEntityTitle() {
    return `${this.record[CONFIG.entities.flight.columns.departureAirport]} -> ${this.record[CONFIG.entities.flight.columns.arrivalAirport]}` || '';
  }
}