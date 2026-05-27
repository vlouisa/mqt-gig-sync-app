/**
 * Base class voor audit-log entries.
 *
 * Bevat generieke auditvelden en serialisatie naar een audit-log rij.
 * Domeinspecifieke subclasses vullen entityType, entityId en entityTitle.
 */
class BaseAuditEntry {
  /**
   * @param {Object} params Audit parameters.
   * @param {string} params.action Actienaam.
   * @param {string} [params.oldStatus] Oude SyncStatus.
   * @param {string} [params.newStatus] Nieuwe SyncStatus.
   * @param {string} [params.details] Details.
   */
  constructor(params) {
    this.action = params.action || '';
    this.oldStatus = params.oldStatus || '';
    this.newStatus = params.newStatus || '';
    this.details = params.details || '';
  }

  /**
   * Type entity, bijvoorbeeld gig, flight of hotel.
   *
   * @returns {string} Entity type.
   */
  getEntityType() {
    return '';
  }

  /**
   * Unieke entity ID.
   *
   * @returns {string} Entity ID.
   */
  getEntityId() {
    return '';
  }

  /**
   * Herkenbare entity titel.
   *
   * @returns {string} Entity titel.
   */
  getEntityTitle() {
    return '';
  }

  /**
   * Bepaalt de huidige gebruiker voor audit logging.
   *
   * @returns {string} Gebruiker of fallback.
   */
  getCurrentAuditUser_() {
    return (
      Session.getActiveUser().getEmail() ||
      Session.getEffectiveUser().getEmail() ||
      'unknown'
    );
  }


  /**
   * Zet de audit entry om naar een rij voor het audit-log tabblad.
   *
   * @param {string} userEmail Uitvoerende gebruiker.
   * @returns {Array<*>} Audit-log rij.
   */
  toRow(userEmail) {
    return [
      new Date(),
      this.action,
      this.getEntityId(),
      this.getEntityTitle(),
      this.oldStatus,
      this.newStatus,
      this.getCurrentAuditUser_(),
      this.details
    ];
  }
}