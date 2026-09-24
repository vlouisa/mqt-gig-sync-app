/**
 * @typedef {Object} TestSuite
 * @property {string} name Naam voor diagnostiek.
 * @property {string[]} sources Bronpaden relatief aan de repository, in laadvolgorde.
 * @property {string} setup JavaScript voor in-memory mocks per nieuwe testcontext.
 * @property {string[]} tests Namen van synchrone globale testfuncties.
 */

/**
 * Expliciete selectie zonder integratietests en appInit.
 * @type {TestSuite[]}
 */
const suites = [
  {
    name: 'gig-date-time',
    sources: [
      'common/calendar-service.js',
      'domain/gig/gig-date-time-service.js',
      'test/helpers/assert-util.js',
      'test/unit/gig-date-time-service-tests.js'
    ],
    setup: 'const Logger = { log() {} };',
    tests: [
      'test_gigDateTimeService_buildStartEnd_movesEndToNextDayWhenEndTimeIsSmallerThanStartTime',
      'test_gigDateTimeService_buildStartEnd_keepsEndOnSameDayWhenEndTimeIsGreaterThanStartTime',
      'test_gigDateTimeService_buildStartEnd_keepsEqualStartAndEndOnSameDay',
      'test_gigDateTimeService_buildStartEnd_handlesMidnightEndAsNextDay',
      'test_gigDateTimeService_buildStartEnd_handlesMidnightStartSameDay'
    ]
  },
  {
    name: 'flight-to-record-mapper',
    sources: [
      'common/config.js',
      'domain/flight/flight-to-record-mapper.js',
      'test/helpers/assert-util.js',
      'test/unit/flight-to-record-mapper-tests.js'
    ],
    setup: `
      const appPropertiesService = {
        getCalendarId: () => 'unit-test-calendar',
        getAdminEmail: () => 'unit-test@example.invalid'
      };
      const Utilities = {
        getUuid: () => '00000000-0000-4000-8000-000000000001'
      };
    `,
    tests: [
      'testFlightToRecordMapperHappyFlow',
      'testFlightToRecordMapperMissingNumberThrows',
      'testFlightToRecordMapperMissingArrivalLocation'
    ]
  }
];

module.exports = suites;
