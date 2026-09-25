/** Stopt lokale common-tests voordat echte services kunnen worden aangeroepen. */
function requireCommonUnit_() {
  if (typeof unit === 'undefined') throw new Error('Alleen uitvoeren via de lokale unit-runner.');
}

/** Vergelijkt JSON-compatibele testwaarden, inclusief objecten en arrays. */
function assertCommonData_(expected, actual) {
  assertEquals(JSON.stringify(expected), JSON.stringify(actual));
}
