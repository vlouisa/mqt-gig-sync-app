/**
 * Audit entry voor gig-acties.
 */
class GigAuditEntry extends BaseAuditEntry {
  /**
   * @param {Object} params Audit parameters.
   * @param {Object} params.record Gig-record.
   */
  constructor(params) {
    super(params);
    this.record = params.record || {};
  }

  /**
   * @returns {string} Entity type.
   */
  getEntityType() {
    return 'gig';
  }

  /**
   * @returns {string} Gig ID.
   */
  getEntityId() {
    return this.record[CONFIG.entities.gig.columns.gigId] || '';
  }

  /**
   * @returns {string} Gig titel.
   */
  getEntityTitle() {
    return this.record[CONFIG.entities.gig.columns.title] || '';
  }
}