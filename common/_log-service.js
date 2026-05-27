/**
 * Centrale logging service.
 */
const logService = (() => {
  const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  };

  /**
   * Bouwt een modulelogger.
   *
   * @param {string} moduleName Naam van de module.
   * @returns {{
   *   info: Function,
   *   warn: Function,
   *   error: Function
   * }} Modulelogger.
   */
  function forModule(moduleName) {
    return {
      /**
       * Logt een INFO bericht.
       *
       * @param {string} action Actiecode.
       * @param {string} message Bericht.
       * @param {string} [details] Extra details.
       * @returns {void}
       */
      info(action, message, details = '') {
        writeLog_(LOG_LEVELS.INFO, moduleName, action, message, details);
      },

      /**
       * Logt een WARN bericht.
       *
       * @param {string} action Actiecode.
       * @param {string} message Bericht.
       * @param {string} [details] Extra details.
       * @returns {void}
       */
      warn(action, message, details = '') {
        writeLog_(LOG_LEVELS.WARN, moduleName, action, message, details);
      },

      /**
       * Logt een ERROR bericht.
       *
       * @param {string} action Actiecode.
       * @param {string} message Bericht.
       * @param {string} [details] Extra details.
       * @returns {void}
       */
      error(action, message, details = '') {
        writeLog_(LOG_LEVELS.ERROR, moduleName, action, message, details);
      }
    };
  }

  /**
   * Schrijft een logregel.
   *
   * @param {string} level Log level.
   * @param {string} moduleName Modulenaam.
   * @param {string} action Actiecode.
   * @param {string} message Bericht.
   * @param {string} details Extra details.
   * @returns {void}
   * @private
   */
  function writeLog_(level, moduleName, action, message, details) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      module: moduleName,
      action,
      message,
      details
    }));
  }

  return {
    forModule
  };
})();