/**
 * Voert tijdgestuurde notificatieregels uit en publiceert hun resultaten via Notify.
 * De caller bewaakt de uitvoering met een scriptlock.
 */
const scheduledNotificationService = (() => {
  /**
   * Controleert regels met één datumcontext en een gedeelde broncache per uitvoering.
   * Fouten worden per regel en per record afgehandeld, zodat verwerking doorgaat.
   * @param {Date} [now] Exact controletijdstip.
   * @param {Object[]} [rules] Optionele selectie, onder andere voor legacy callers.
   * @returns {void}
   */
  function check(now = new Date(), rules = scheduledNotificationRules.getAll()) {
    const log = logService.forModule('scheduled-notification-service');
    const context = createDateContext_(now);
    const run = {
      log,
      context,
      time: Utilities.formatDate(now, context.zone, 'HH:mm'),
      sources: new Map(),
      ruleIds: new Set(),
      eventCodes: new Set()
    };

    initNotifications();
    rules.forEach(rule => processRule_(rule, run));
  }

  /**
   * Bepaalt lokale kalenderdatums; gisteren is geen aftrek van 24 uur.
   * @param {Date} now Exact controletijdstip.
   * @returns {{zone: string, today: string, yesterday: string}} Datums als yyyy-MM-dd.
   */
  function createDateContext_(now) {
    const zone = Session.getScriptTimeZone();
    const today = Utilities.formatDate(now, zone, 'yyyy-MM-dd');
    // UTC dient uitsluitend voor kalenderrekenen op de al bepaalde lokale datum.
    const previous = new Date(`${today}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);

    return { zone, today, yesterday: previous.toISOString().slice(0, 10) };
  }

  /** Valideert en verwerkt één regel; regelfouten blokkeren volgende regels niet. */
  function processRule_(rule, run) {
    try {
      registerRuleIdentity_(rule, run);
      if (!rule.enabled) return;

      validateRule_(rule);
      if (run.time < rule.notificationTime) return;

      const entity = CONFIG.entities[rule.entity];
      if (!entity || !Array.isArray(rule.requiredColumns)) {
        throw new Error('Ongeldige regelbron.');
      }

      const source = getSource_(entity.sheetName, run.sources);
      validateRequiredColumns_(rule, entity, source.headers);
      source.rows.forEach(record => processRecord_(rule, record, entity.sheetName, run));
    } catch (error) {
      run.log.error('scheduled-notification-rule-error', error.message, `Rule: ${rule.id}`);
    }
  }

  /** Ook uitgeschakelde of ongeldige regels reserveren hun unieke ID en eventcode. */
  function registerRuleIdentity_(rule, run) {
    if (!rule.id || !rule.eventCode || run.ruleIds.has(rule.id) || run.eventCodes.has(rule.eventCode)) {
      throw new Error('Ontbrekende of dubbele notificatieregel-ID/eventcode.');
    }
    run.ruleIds.add(rule.id);
    run.eventCodes.add(rule.eventCode);
  }

  /** @throws {Error} Bij een ongeldig meldtijdstip of ontbrekende regelfunctie. */
  function validateRule_(rule) {
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.notificationTime);
    if (!validTime || typeof rule.evaluate !== 'function' || typeof rule.createMessage !== 'function') {
      throw new Error('Ongeldige notificatieregel; controleer tijdstip en functies.');
    }
  }

  /**
   * Deelt succesvol gelezen brongegevens tussen regels binnen dezelfde uitvoering.
   * @param {string} sheetName Brontabblad.
   * @param {Map} sources Broncache van de huidige uitvoering.
   * @returns {{headers: string[], rows: Object[]}} Headers en records.
   */
  function getSource_(sheetName, sources) {
    if (!sources.has(sheetName)) {
      sources.set(sheetName, {
        headers: sheetService.getHeaders(sheetService.getSheet(sheetName)),
        rows: sheetService.getRowsAsObjects(sheetName)
      });
    }
    return sources.get(sheetName);
  }

  /** Valideert per regel: een ontbrekende kolom blokkeert alleen afhankelijke regels. */
  function validateRequiredColumns_(rule, entity, headers) {
    rule.requiredColumns.forEach(key => {
      const columnName = entity.columns[key];
      if (!headers.includes(columnName)) {
        throw new Error(`Verplichte kolom ontbreekt: ${columnName || key}`);
      }
    });
  }

  /** Evalueert één record; selectie- en publicatiefouten blokkeren andere records niet. */
  function processRecord_(rule, record, sheetName, run) {
    let sourceId = '';
    try {
      const result = rule.evaluate(record, run.context);
      if (!result) return;

      const { fingerprintValues, ...payload } = result;
      sourceId = payload.sourceId || '';
      publishNotification_(rule.eventCode, payload, fingerprintValues);
    } catch (error) {
      run.log.error('scheduled-notification-record-error', error.message,
        `Rule: ${rule.id}, Row: ${record.rowNumber}, Source: ${sheetName}, SourceId: ${sourceId}`);
    }
  }

  /**
   * Valideert de identiteit en zet de melding klaar; Notify verzorgt deduplicatie en aflevering.
   * @param {string} eventCode Eventcode uit de rule.
   * @param {Object} payload Berichtvelden inclusief sourceId, zonder fingerprintValues.
   * @param {Array<*>} fingerprintValues Stabiele waarden die de melding identificeren.
   * @throws {Error} Bij ontbrekende identiteit/fingerprintwaarden of een publicatiefout.
   */
  function publishNotification_(eventCode, payload, fingerprintValues) {
    if (!payload.sourceId) throw new Error('Bron-ID ontbreekt voor notificatie.');
    if (!Array.isArray(fingerprintValues) || !fingerprintValues.length) {
      throw new Error('Fingerprintwaarden ontbreken voor notificatie.');
    }
    payload.notificationFingerprint = Notify.notificationFingerprintService.create(fingerprintValues);
    Notify.notificationPublisher.publish(eventCode, payload);
  }

  return { check };
})();
