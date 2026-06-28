/**
 * Tests voor gigDateTimeService.
 *
 * Deze tests zijn veilig:
 * - geen Sheet-mutaties;
 * - geen Calendar-mutaties;
 * - geen sync;
 * - alleen pure datum/tijd-logica.
 */

/**
 * Draait alle gigDateTimeService-tests.
 *
 * @returns {void}
 */
function runGigDateTimeServiceTests() {
  test_gigDateTimeService_buildStartEnd_movesEndToNextDayWhenEndTimeIsSmallerThanStartTime();
  test_gigDateTimeService_buildStartEnd_keepsEndOnSameDayWhenEndTimeIsGreaterThanStartTime();
  test_gigDateTimeService_buildStartEnd_keepsEqualStartAndEndOnSameDay();
  test_gigDateTimeService_buildStartEnd_handlesMidnightEndAsNextDay();
  test_gigDateTimeService_buildStartEnd_handlesMidnightStartSameDay();

  Logger.log('Alle gigDateTimeService-tests succesvol afgerond.');
}

/**
 * Test dat een eindtijd kleiner dan de starttijd als volgende dag wordt gezien.
 *
 * Voorbeeld:
 * 2026-07-11 23:50 t/m 2026-07-12 01:00
 *
 * @returns {void}
 */
function test_gigDateTimeService_buildStartEnd_movesEndToNextDayWhenEndTimeIsSmallerThanStartTime() {
  // Arrange
  const date = new Date(2026, 6, 11); // 11 juli 2026
  const start = '23:50';
  const end = '01:00';

  // Act
  const result = gigDateTimeService.buildStartEnd(date, start, end);

  // Assert start: 2026-07-11 23:50
  assertEquals(2026, result.startDateTime.getFullYear());
  assertEquals(6, result.startDateTime.getMonth());
  assertEquals(11, result.startDateTime.getDate());
  assertEquals(23, result.startDateTime.getHours());
  assertEquals(50, result.startDateTime.getMinutes());

  // Assert end: 2026-07-12 01:00
  assertEquals(2026, result.endDateTime.getFullYear());
  assertEquals(6, result.endDateTime.getMonth());
  assertEquals(12, result.endDateTime.getDate());
  assertEquals(1, result.endDateTime.getHours());
  assertEquals(0, result.endDateTime.getMinutes());
}

/**
 * Test dat een normale eindtijd op dezelfde dag blijft.
 *
 * Voorbeeld:
 * 2026-07-11 20:00 t/m 2026-07-11 23:00
 *
 * @returns {void}
 */
function test_gigDateTimeService_buildStartEnd_keepsEndOnSameDayWhenEndTimeIsGreaterThanStartTime() {
  // Arrange
  const date = new Date(2026, 6, 11);
  const start = '20:00';
  const end = '23:00';

  // Act
  const result = gigDateTimeService.buildStartEnd(date, start, end);

  // Assert start: 2026-07-11 20:00
  assertEquals(2026, result.startDateTime.getFullYear());
  assertEquals(6, result.startDateTime.getMonth());
  assertEquals(11, result.startDateTime.getDate());
  assertEquals(20, result.startDateTime.getHours());
  assertEquals(0, result.startDateTime.getMinutes());

  // Assert end: 2026-07-11 23:00
  assertEquals(2026, result.endDateTime.getFullYear());
  assertEquals(6, result.endDateTime.getMonth());
  assertEquals(11, result.endDateTime.getDate());
  assertEquals(23, result.endDateTime.getHours());
  assertEquals(0, result.endDateTime.getMinutes());
}

/**
 * Test dat gelijke start- en eindtijd niet automatisch naar de volgende dag gaan.
 *
 * Daardoor kan gigSyncService.validateGig_ deze situatie nog steeds afkeuren
 * met: End moet later zijn dan Start.
 *
 * Voorbeeld:
 * 2026-07-11 23:00 t/m 2026-07-11 23:00
 *
 * @returns {void}
 */
function test_gigDateTimeService_buildStartEnd_keepsEqualStartAndEndOnSameDay() {
  // Arrange
  const date = new Date(2026, 6, 11);
  const start = '23:00';
  const end = '23:00';

  // Act
  const result = gigDateTimeService.buildStartEnd(date, start, end);

  // Assert start: 2026-07-11 23:00
  assertEquals(2026, result.startDateTime.getFullYear());
  assertEquals(6, result.startDateTime.getMonth());
  assertEquals(11, result.startDateTime.getDate());
  assertEquals(23, result.startDateTime.getHours());
  assertEquals(0, result.startDateTime.getMinutes());

  // Assert end: 2026-07-11 23:00
  assertEquals(2026, result.endDateTime.getFullYear());
  assertEquals(6, result.endDateTime.getMonth());
  assertEquals(11, result.endDateTime.getDate());
  assertEquals(23, result.endDateTime.getHours());
  assertEquals(0, result.endDateTime.getMinutes());
}

/**
 * Test dat een eindtijd van 00:00 na een late starttijd naar de volgende dag gaat.
 *
 * Voorbeeld:
 * 2026-07-11 22:30 t/m 2026-07-12 00:00
 *
 * @returns {void}
 */
function test_gigDateTimeService_buildStartEnd_handlesMidnightEndAsNextDay() {
  // Arrange
  const date = new Date(2026, 6, 11);
  const start = '22:30';
  const end = '00:00';

  // Act
  const result = gigDateTimeService.buildStartEnd(date, start, end);

  // Assert start: 2026-07-11 22:30
  assertEquals(2026, result.startDateTime.getFullYear());
  assertEquals(6, result.startDateTime.getMonth());
  assertEquals(11, result.startDateTime.getDate());
  assertEquals(22, result.startDateTime.getHours());
  assertEquals(30, result.startDateTime.getMinutes());

  // Assert end: 2026-07-12 00:00
  assertEquals(2026, result.endDateTime.getFullYear());
  assertEquals(6, result.endDateTime.getMonth());
  assertEquals(12, result.endDateTime.getDate());
  assertEquals(0, result.endDateTime.getHours());
  assertEquals(0, result.endDateTime.getMinutes());
}

/**
 * Test dat een starttijd van 00:00 gewoon dezelfde dag blijft
 * als de eindtijd later is.
 *
 * Voorbeeld:
 * 2026-07-11 00:00 t/m 2026-07-11 01:00
 *
 * @returns {void}
 */
function test_gigDateTimeService_buildStartEnd_handlesMidnightStartSameDay() {
  // Arrange
  const date = new Date(2026, 6, 11);
  const start = '00:00';
  const end = '01:00';

  // Act
  const result = gigDateTimeService.buildStartEnd(date, start, end);

  // Assert start: 2026-07-11 00:00
  assertEquals(2026, result.startDateTime.getFullYear());
  assertEquals(6, result.startDateTime.getMonth());
  assertEquals(11, result.startDateTime.getDate());
  assertEquals(0, result.startDateTime.getHours());
  assertEquals(0, result.startDateTime.getMinutes());

  // Assert end: 2026-07-11 01:00
  assertEquals(2026, result.endDateTime.getFullYear());
  assertEquals(6, result.endDateTime.getMonth());
  assertEquals(11, result.endDateTime.getDate());
  assertEquals(1, result.endDateTime.getHours());
  assertEquals(0, result.endDateTime.getMinutes());
}