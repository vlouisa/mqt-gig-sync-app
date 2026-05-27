/**
 * Audit entry voor hotel-acties.
 */
class HotelAuditEntry extends BaseAuditEntry {
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
    return 'hotel';
  }

  /**
   * @returns {string} Hotel ID.
   */
  getEntityId() {
    return this.record[CONFIG.entities.hotel.columns.hotelId] || '';
  }

  /**
   * @returns {string} Hotelnaam.
   */
  getEntityTitle() {
    return this.record[CONFIG.entities.hotel.columns.hotel] || '';
  }
}