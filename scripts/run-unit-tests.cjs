const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const suites = require('./unit-test-suites.cjs');

// Datumlogica gebruikt dezelfde lokale tijdzone als het Apps Script-project.
process.env.TZ = 'Europe/Brussels';

const projectRoot = path.resolve(__dirname, '..');
const timeout = 5000;

/**
 * Kleurt een terminalstatus tenzij NO_COLOR is ingesteld.
 * @param {'PASS'|'FAIL'} status Teststatus.
 * @param {{isTTY?: boolean}} stream Uitvoerstroom voor terminaldetectie.
 * @returns {string} Status met ANSI-kleurcodes of ongewijzigde tekst.
 */
function formatStatus(status, stream) {
  if (!stream.isTTY || process.env.NO_COLOR !== undefined) {
    return status;
  }

  const color = status === 'PASS' ? '\u001b[32m' : '\u001b[31m';
  return `${color}${status}\u001b[0m`;
}

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
        // Absolute bestandsnamen koppelen V8-coverage aan de echte bronbestanden.
        const filename = path.join(projectRoot, source);
        const code = fs.readFileSync(filename, 'utf8');
        vm.runInContext(code, context, { timeout, filename });
      }

      vm.runInContext(`${testName}();`, context, { timeout, filename: testName });
      passed++;
      console.log(`${formatStatus('PASS', process.stdout)} ${suite.name}: ${testName}`);
    } catch (error) {
      failed++;
      console.error(`${formatStatus('FAIL', process.stderr)} ${suite.name}: ${testName}`);
      console.error(error.stack || error.message || String(error));
    }
  }
}

console.log(`\n${passed} geslaagd, ${failed} mislukt (${process.env.TZ}).`);
process.exitCode = failed > 0 ? 1 : 0;
