/**
 * Gig-specifieke datum/tijd-service.
 *
 * Verantwoordelijkheden:
 * - bouwt start- en einddatumtijd voor gigs;
 * - behandelt gigs die na middernacht eindigen.
 */
const gigDateTimeService = (() => {
  /**
   * Bouwt start- en einddatumtijd voor een gig.
   *
   * Gig-regel:
   * als de eindtijd kleiner is dan de starttijd,
   * wordt de eindtijd gezien als tijd op de volgende dag.
   *
   * @param {Date|string} date Gigdatum.
   * @param {Date|string} start Starttijd.
   * @param {Date|string} end Eindtijd.
   * @returns {{startDateTime: Date, endDateTime: Date}} Start- en einddatumtijd.
   */
  function buildStartEnd(date, start, end) {
    const startDateTime = calendarService.buildDateTime(date, start);
    const endDateTime = calendarService.buildDateTime(date, end);

    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    return {
      startDateTime,
      endDateTime
    };
  }

  return {
    buildStartEnd
  };
})();