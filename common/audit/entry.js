/**
 * Factory voor audit-entry objecten.
 */
const entry = (() => {
  /**
   * Bouwt een GigAuditEntry.
   *
   * @param {Object} params Audit parameters.
   * @returns {GigAuditEntry} Audit-entry.
   */
  function gig(params) {
    return new GigAuditEntry(params);
  }

  /**
   * Bouwt een FlightAuditEntry.
   *
   * @param {Object} params Audit parameters.
   * @returns {FlightAuditEntry} Audit-entry.
   */
  function flight(params) {
    return new FlightAuditEntry(params);
  }

  /**
   * Bouwt een HotelAuditEntry.
   *
   * @param {Object} params Audit parameters.
   * @returns {HotelAuditEntry} Audit-entry.
   */
  function hotel(params) {
    return new HotelAuditEntry(params);
  }


  /**
   * Bouwt een BlockedDateAuditEntry.
   *
   * @param {Object} params Audit parameters.
   * @returns {BlockedDateAuditEntry} Audit-entry.
   */
  function blockedDate(params) {
    return new BlockedDateAuditEntry(params);
  }

  return {
    gig,
    flight,
    hotel,
    blockedDate
  };
})();