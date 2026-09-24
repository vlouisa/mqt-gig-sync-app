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

const domainSetup = require('./domain-test-support.cjs');
const domainSources = ['common/config.js', 'infrastructure/notification/notification-events.js', 'test/helpers/assert-util.js'];

// Elke suite laadt één te testen service; overige externe afhankelijkheden zijn mocks.
for (const [domain, folder] of [['gig', 'gig'], ['flight', 'flight'], ['hotel', 'hotel'], ['blockedDate', 'blocked-date']]) {
  const dates = ['common/calendar-service.js', 'domain/gig/gig-date-time-service.js'];
  suites.push({
    name: `${folder}-calendar`,
    setup: domainSetup(domain, 'calendar', `${domain}CalendarService`),
    sources: [...domainSources, ...dates, `domain/${folder}/${folder}-calendar-service.js`, 'test/unit/domain-calendar-tests.js'],
    tests: ['testDomainCalendarCreate', 'testDomainCalendarUpdate', 'testDomainCalendarMissingEventRecreated', 'testDomainCalendarDelete']
  });
  suites.push({
    name: `${folder}-sync`,
    setup: domainSetup(domain, 'sync', `${domain}SyncService`),
    sources: [...domainSources, ...dates, `domain/${folder}/${folder}-sync-service.js`, 'test/unit/domain-sync-tests.js'],
    tests: ['testDomainSyncPublish', 'testDomainSyncSkipsInactiveRows', 'testDomainSyncDelete',
      'testDomainSyncErrorIsolation', 'testDomainSyncRequiredField',
      ...(['gig', 'blockedDate'].includes(domain) ? ['testDomainSyncInvalidDateRange', 'testDomainSyncTechnicalFields'] : [])]
  });
}
for (const domain of ['flight', 'hotel']) {
  suites.push({
    name: `${domain}-mail`, setup: domainSetup(domain, 'mail', `${domain}MailImportService`),
    sources: [...domainSources, `domain/${domain}/${domain}-mail-import-service.js`, 'test/unit/domain-mail-tests.js'],
    tests: ['testDomainMailImport', 'testDomainMailDuplicate', 'testDomainMailErrorIsolation',
      ...(domain === 'flight' ? ['testFlightMailRouteDuplicate', 'testFlightMailEmptyAndUnknown'] : [])]
  });
}
suites.push(
  {
    name: 'flight-import', setup: domainSetup('flight', 'import', 'flightImportToSheetService'),
    sources: [...domainSources, 'domain/flight/flight-import-to-sheet-service.js', 'test/unit/domain-import-tests.js'],
    tests: ['testFlightImportNumber', 'testFlightImportFailure', 'testFlightImportRoute', 'testFlightImportRouteRejected']
  },
  {
    name: 'hotel-import', setup: domainSetup('hotel', 'import', 'hotelImportToSheetService'),
    sources: [...domainSources, 'domain/hotel/hotel-import-to-sheet.js', 'test/unit/domain-import-tests.js'],
    tests: ['testHotelImportMapping', 'testHotelImportValidation']
  },
  {
    name: 'flight-api', setup: domainSetup('flight', 'api', 'flightApi'),
    sources: [...domainSources, 'domain/flight/flight-api.js', 'test/unit/domain-api-tests.js'],
    tests: ['testFlightApiNumberCache', 'testFlightApiCreatesCache', 'testFlightApiRouteWindow',
      'testFlightApiHttpError', 'testFlightApiInvalidJson', 'testFlightApiValidation']
  },
  {
    name: 'gig-notification', setup: domainSetup('gig', 'notification', 'gigNotificationService'),
    sources: [...domainSources, 'domain/gig/gig-notification-service.js', 'test/unit/domain-user-notification-tests.js'],
    tests: ['testGigNotificationPayload']
  },
  {
    name: 'user-edit', setup: domainSetup('user', 'user', 'userOnEditService'),
    sources: [...domainSources, 'domain/user/user-on-edit-service.js', 'test/unit/domain-user-notification-tests.js'],
    tests: ['testUserEditIgnored', 'testUserEditAssignsId']
  }
);

module.exports = suites;
