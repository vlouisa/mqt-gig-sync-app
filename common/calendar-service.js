/**
 * Shared Calendar helper service.
 */
const calendarService = (() => {
  /**
   * Bouwt een JavaScript Date object op basis van een datum en tijd.
   *
   * @param {*} dateValue Datumwaarde.
   * @param {*} timeValue Tijdwaarde.
   * @returns {Date} Samengevoegde datum+tijd.
   */
  function buildDateTime(dateValue, timeValue) {
    const date = normalizeDate_(dateValue);
    const time = normalizeTime_(timeValue);

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getSeconds()
    );
  }

  /**
   * Normaliseert een datumwaarde naar een Date object.
   *
   * @param {*} value Datumwaarde.
   * @returns {Date} Genormaliseerde datum.
   * @throws {Error} Als de datum ongeldig is.
   */
  function normalizeDate_(value) {
    const date = value instanceof Date
      ? new Date(value)
      : new Date(value);

    if (isNaN(date.getTime())) {
      throw new Error(`Ongeldige datumwaarde: ${value}`);
    }

    return date;
  }

  /**
   * Normaliseert een tijdwaarde naar een Date object.
   *
   * @param {*} value Tijdwaarde.
   * @returns {Date} Genormaliseerde tijd.
   * @throws {Error} Als de tijd ongeldig is.
   */
  function normalizeTime_(value) {
    const time = value instanceof Date
      ? new Date(value)
      : new Date(`1970-01-01T${value}`);

    if (isNaN(time.getTime())) {
      throw new Error(`Ongeldige tijdwaarde: ${value}`);
    }

    return time;
  }

  return {
    buildDateTime
  };
})();