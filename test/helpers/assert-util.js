/**
 * Controleert of twee waarden gelijk zijn.
 *
 * @param {*} expected Verwachte waarde.
 * @param {*} actual Werkelijke waarde.
 * @param {string} [label] Optioneel label voor de foutmelding.
 * @returns {void}
 * Gebruikt strikte gelijkheid (===), geen diepe objectvergelijking.
   * @throws {Error} Als de assertion niet slaagt.
   */
function assertEquals(expected, actual, label = '') {
  if (expected !== actual) {
    throw new Error(
      (label ? label + ': ' : '') +
      'Assertion failed. Expected: ' + expected + ', actual: ' + actual
    );
  }
}

/**
 * Controleert of twee waarden niet gelijk zijn.
 *
 * @param {*} unexpected Waarde die niet verwacht wordt.
 * @param {*} actual Werkelijke waarde.
 * @returns {void}
 * Gebruikt strikte gelijkheid (===), geen diepe objectvergelijking.
   * @throws {Error} Als de assertion niet slaagt.
   */
function assertNotEquals(unexpected, actual) {
  if (unexpected === actual) {
    throw new Error(
      'Assertion failed. Did not expect: ' + unexpected
    );
  }
}

/**
 * Controleert of een waarde true is.
 *
 * @param {*} value Te controleren waarde.
 * @returns {void}
 * @throws {Error} Als de assertion niet slaagt.
   */
function assertTrue(value) {
  if (value !== true) {
    throw new Error(
      'Assertion failed. Expected true, actual: ' + value
    );
  }
}

/**
 * Controleert of een waarde false is.
 *
 * @param {*} value Te controleren waarde.
 * @returns {void}
 * @throws {Error} Als de assertion niet slaagt.
   */
function assertFalse(value) {
  if (value !== false) {
    throw new Error(
      'Assertion failed. Expected false, actual: ' + value
    );
  }
}

/**
 * Controleert of een waarde niet leeg is.
 *
 * @param {*} value Te controleren waarde.
 * @returns {void}
 * @throws {Error} Als de assertion niet slaagt.
   */
function assertNotEmpty(value) {
  if (value === null || value === undefined || value === '') {
    throw new Error(
      'Assertion failed. Expected non-empty value, actual: ' + value
    );
  }
}

/**
 * Controleert of een functie de verwachte foutmelding gooit.
 *
 * @param {Function} fn Functie die een error moet gooien.
 * @param {string} expectedMessage Verwachte foutmelding.
 * @returns {void}
 * Verwacht een synchrone functie en vergelijkt error.message exact.
   * @throws {Error} Als de assertion niet slaagt.
   */
function assertThrows(fn, expectedMessage) {
  try {
    fn();
  } catch (error) {
    if (error.message !== expectedMessage) {
      throw new Error(
        `Onverwachte foutmelding. Verwacht: ${expectedMessage}, gekregen: ${error.message}`
      );
    }

    return;
  }

  throw new Error(`Verwachte fout werd niet gegooid: ${expectedMessage}`);
}
