/**
 * Service voor het bewaken en uitvoeren van geldige SyncStatus-overgangen.
 */
const syncStatusService = (() => {
  /**
   * Normaliseert een SyncStatus-waarde.
   *
   * @param {*} status SyncStatus-waarde.
   * @returns {string} Genormaliseerde SyncStatus.
   */
  function normalizeStatus(status) {
    return String(status || '').trim();
  }

  /**
   * Controleert of een overgang van de huidige status naar een nieuwe status is toegestaan.
   *
   * @param {string} fromStatus Huidige SyncStatus.
   * @param {string} toStatus Gewenste nieuwe SyncStatus.
   * @returns {boolean} True als de overgang is toegestaan.
   */
  function canTransition(fromStatus, toStatus) {
    const from = normalizeStatus(fromStatus);
    const to = normalizeStatus(toStatus);

    if (from === to) {
      return true;
    }

    if (!from) {
      return to === CONFIG.syncStatuses.draft;
    }

    const allowedNextStatuses = CONFIG.syncStatusTransitions[from] || [];

    return allowedNextStatuses.includes(to);
  }

  /**
   * Valideert of een overgang is toegestaan.
   *
   * @param {string} fromStatus Huidige SyncStatus.
   * @param {string} toStatus Gewenste nieuwe SyncStatus.
   * @throws {Error} Als de overgang niet is toegestaan.
   * @returns {void}
   */
  function assertCanTransition(fromStatus, toStatus) {
    if (!canTransition(fromStatus, toStatus)) {
      throw new Error(`Ongeldige SyncStatus overgang: ${fromStatus || '(leeg)'} → ${toStatus}`);
    }
  }

  /**
   * Zet de SyncStatus van een rij naar een nieuwe status.
   *
   * @param {number} rowNumber Rij nummer in de Sheet.
   * @param {string} toStatus Gewenste nieuwe SyncStatus.
   * @param {string} sheetName Naam van het tabblad.
   * @param {string} syncStatusColumnName Headernaam van de SyncStatus-kolom.
   * @returns {{fromStatus: string, toStatus: string, changed: boolean}} De uitgevoerde statusovergang.
   */
  function setStatus(rowNumber, toStatus, sheetName, syncStatusColumnName) {
    if (!sheetName) {
      throw new Error('sheetName ontbreekt bij setStatus().');
    }

    if (!syncStatusColumnName) {
      throw new Error('syncStatusColumnName ontbreekt bij setStatus().');
    }

    const sheet = sheetService.getSheet(sheetName);
    const columnMap = sheetService.getColumnIndexMapCached(sheetName);
    const syncStatusColumnIndex = columnMap[syncStatusColumnName];

    if (!syncStatusColumnIndex) {
      throw new Error(`SyncStatus kolom niet gevonden: ${syncStatusColumnName} in sheet ${sheetName}`);
    }

    const statusCell = sheet.getRange(rowNumber, syncStatusColumnIndex);

    const fromStatus = normalizeStatus(statusCell.getValue());
    const normalizedToStatus = normalizeStatus(toStatus);

    if (fromStatus === normalizedToStatus) {
      return {
        fromStatus,
        toStatus: normalizedToStatus,
        changed: false
      };
    }

    assertCanTransition(fromStatus, normalizedToStatus);

    statusCell.setValue(normalizedToStatus);

    return {
      fromStatus,
      toStatus: normalizedToStatus,
      changed: true
    };
  }

  return {
    normalizeStatus,
    canTransition,
    assertCanTransition,
    setStatus
  };
})();