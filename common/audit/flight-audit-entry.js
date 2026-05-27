/**
 * Audit entry voor hotel-acties.
 */
class FlightAuditEntry extends BaseAuditEntry {
  /**
   * @param {Object} params Audit parameters.
   * @param {Object} params.record Hotel-record.
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
   * @returns {string} Hotel ID.
   */
  getEntityId() {
    return this.record[CONFIG.entities.flight.columns.flightId] || '';
  }

  /**
   * @returns {string} Hotelnaam.
   */
  getEntityTitle() {
    return `${this.record[CONFIG.entities.flight.columns.departureAirport]} -> ${this.record[CONFIG.entities.flight.columns.arrivalAirport]}` || '';
  }
}