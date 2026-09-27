/**
 * Service voor applicatie-instellingen uit Script Properties.
 */
const appPropertiesService = (() => {
  /**
   * Geeft de MQT Calendar ID terug.
   *
   * @returns {string} Calendar ID.
   * @throws {Error} Als MQT_CALENDAR_ID ontbreekt of leeg is.
   */
  function getCalendarId() {
    return getRequiredProperty_('MQT_CALENDAR_ID');
  }

  /**
   * Geeft het admin e-mailadres terug.
   *
   * @returns {string} Admin e-mailadres.
   * @throws {Error} Als MQT_ADMIN_EMAIL ontbreekt of leeg is.
   */
  function getAdminEmail() {
    return getRequiredProperty_('MQT_ADMIN_EMAIL');
  }

  /**
   * Haalt een verplichte Script Property op.
   *
   * @param {string} key Property key.
   * @returns {string} Property value.
   * @throws {Error} Als de property ontbreekt.
   */
  function getRequiredProperty_(key) {
    const value = PropertiesService
      .getScriptProperties()
      .getProperty(key);

    if (!value) {
      throw new Error(`Script property ontbreekt: ${key}`);
    }

    return value;
  }

  return {
    /** Alleen bij handmatig archiveren lezen; ontbrekende properties gebruiken de afgesproken defaults. */
    getAuditArchiveSettings() {
      const props = PropertiesService.getScriptProperties();
      function positiveInteger(key, fallback) {
        const raw = props.getProperty(key);
        if (raw === null || raw === undefined) return fallback;
        if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1) {
          throw new Error(`Ongeldige positieve gehele waarde voor ${key}.`);
        }
        return Number(raw);
      }
      const folderId = props.getProperty('AUDIT_ARCHIVE_FOLDER_ID') ?? '1AQ9lp0c6wkIytIVaXDhhY-SpUlbouWfF';
      if (!folderId.trim()) throw new Error('AUDIT_ARCHIVE_FOLDER_ID is leeg.');
      return { folderId: folderId.trim(), retentionDays: positiveInteger('AUDIT_RETENTION_DAYS', 30),
        batchSize: positiveInteger('AUDIT_ARCHIVE_BATCH_SIZE', 250) };
    },
    getCalendarId,
    getAdminEmail,
    // Pas bij de handmatige WordPress-actie lezen; overige workflows hebben dit niet nodig.
    getWordPressBaseUrl: () => getRequiredProperty_('WORDPRESS_BASE_URL'),
    getWordPressUsername: () => getRequiredProperty_('WORDPRESS_USERNAME'),
    getWordPressApplicationPassword: () => getRequiredProperty_('WORDPRESS_APPLICATION_PASSWORD')
  };
})();
