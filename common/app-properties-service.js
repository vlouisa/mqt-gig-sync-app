/**
 * Service voor applicatie-instellingen uit Script Properties.
 */
const appPropertiesService = (() => {
  /**
   * Geeft de MQT Calendar ID terug.
   *
   * @returns {string} Calendar ID.
   */
  function getCalendarId() {
    return getRequiredProperty_('MQT_CALENDAR_ID');
  }

  /**
   * Geeft het admin e-mailadres terug.
   *
   * @returns {string} Admin e-mailadres.
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
    getCalendarId,
    getAdminEmail
  };
})();