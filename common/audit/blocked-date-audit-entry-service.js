/**
 * Audit entry voor blocked-date-acties.
 */
class BlockedDateAuditEntry extends BaseAuditEntry {
  /**
   * @param {Object} params Audit parameters.
   * @param {Object} params.record Blocked-date-record.
   */
  constructor(params) {
    super(params);
    this.record = params.record || {};
  }

  /**
   * @returns {string} Entity type.
   */
  getEntityType() {
    return 'blocked-date';
  }

  /**
   * @returns {string} Block ID.
   */
  getEntityId() {
    return this.record[CONFIG.entities.blockedDate.columns.blockId] || '';
  }

  /**
   * @returns {string} Naam.
   */
  getEntityTitle() {
    return this.record[CONFIG.entities.blockedDate.columns.name] || '';
  }
}