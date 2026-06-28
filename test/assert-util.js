/**
 * Controleert of twee waarden gelijk zijn.
 *
 * @param {*} expected Verwachte waarde.
 * @param {*} actual Werkelijke waarde.
 * @returns {void}
 */
function assertEquals(expected, actual) {
  if (expected !== actual) {
    throw new Error(
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
 */
function assertNotEmpty(value) {
  if (value === null || value === undefined || value === '') {
    throw new Error(
      'Assertion failed. Expected non-empty value, actual: ' + value
    );
  }
}