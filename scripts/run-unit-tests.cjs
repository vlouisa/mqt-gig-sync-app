const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Datumlogica gebruikt dezelfde lokale tijdzone als het Apps Script-project.
process.env.TZ = 'Europe/Brussels';

const projectRoot = path.resolve(__dirname, '..');
const timeout = 5000;

// Expliciete selectie: integratietests en appInit worden nooit ingeladen.
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

let passed = 0;
let failed = 0;

for (const suite of suites) {
  for (const testName of suite.tests) {
    try {
      // Iedere test krijgt eigen globals, mocks en ingebouwde Date-objecten.
      // Geen Node-API's of echte Apps Script-services doorgeven aan de context.
      const context = vm.createContext(Object.create(null));
      vm.runInContext(suite.setup, context, { timeout, filename: `${suite.name}-setup` });

      for (const source of suite.sources) {
        const code = fs.readFileSync(path.join(projectRoot, source), 'utf8');
        vm.runInContext(code, context, { timeout, filename: source });
      }

      vm.runInContext(`${testName}();`, context, { timeout, filename: testName });
      passed++;
      console.log(`PASS ${testName}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${testName}`);
      console.error(error.stack || error.message || String(error));
    }
  }
}

console.log(`\n${passed} geslaagd, ${failed} mislukt (${process.env.TZ}).`);
process.exitCode = failed > 0 ? 1 : 0;
