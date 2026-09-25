/** Evalueert tijdgestuurde regels; de caller bewaakt publicatie met een scriptlock. */
const scheduledNotificationService = (() => {
  /**
   * Leest iedere bron eenmaal en isoleert fouten per regel en record.
   * @param {Date} [now] Exact controletijdstip.
   * @param {Object[]} [rules] Optionele selectie, onder andere voor legacy callers.
   * @returns {void}
   */
  function check(now = new Date(), rules = scheduledNotificationRules.getAll()) {
    const log = logService.forModule('scheduled-notification-service');
    const zone = Session.getScriptTimeZone();
    const today = Utilities.formatDate(now, zone, 'yyyy-MM-dd');
    // UTC wordt hier uitsluitend gebruikt voor kalenderrekenen op een lokale datum.
    const previous = new Date(`${today}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    const context = { zone, today, yesterday: previous.toISOString().slice(0, 10) };
    const time = Utilities.formatDate(now, zone, 'HH:mm');
    const sources = new Map();
    const ids = new Set();
    const events = new Set();
    initNotifications();

    rules.forEach(rule => {
      try {
        if (!rule.id || !rule.eventCode || ids.has(rule.id) || events.has(rule.eventCode)) {
          throw new Error('Ontbrekende of dubbele notificatieregel-ID/eventcode.');
        }
        ids.add(rule.id);
        events.add(rule.eventCode);
        if (!rule.enabled) return;
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.notificationTime) ||
            typeof rule.evaluate !== 'function' || typeof rule.createMessage !== 'function') {
          throw new Error('Ongeldige notificatieregel; controleer tijdstip en functies.');
        }
        if (time < rule.notificationTime) return;
        const entity = CONFIG.entities[rule.entity];
        if (!entity || !Array.isArray(rule.requiredColumns)) throw new Error('Ongeldige regelbron.');
        if (!sources.has(entity.sheetName)) {
          sources.set(entity.sheetName, {
            headers: sheetService.getHeaders(sheetService.getSheet(entity.sheetName)),
            rows: sheetService.getRowsAsObjects(entity.sheetName)
          });
        }
        const source = sources.get(entity.sheetName);
        rule.requiredColumns.forEach(key => {
          if (!source.headers.includes(entity.columns[key])) {
            throw new Error(`Verplichte kolom ontbreekt: ${entity.columns[key] || key}`);
          }
        });
        source.rows.forEach(record => {
          let sourceId = '';
          try {
            const result = rule.evaluate(record, context);
            if (!result) return;
            const { fingerprintValues, ...payload } = result;
            sourceId = payload.sourceId || '';
            if (!payload.sourceId) throw new Error('Bron-ID ontbreekt voor notificatie.');
            if (!Array.isArray(fingerprintValues) || !fingerprintValues.length) {
              throw new Error('Fingerprintwaarden ontbreken voor notificatie.');
            }
            payload.notificationFingerprint = Notify.notificationFingerprintService.create(fingerprintValues);
            Notify.notificationPublisher.publish(rule.eventCode, payload);
          } catch (error) {
            log.error('scheduled-notification-record-error', error.message,
              `Rule: ${rule.id}, Row: ${record.rowNumber}, Source: ${entity.sheetName}, SourceId: ${sourceId}`);
          }
        });
      } catch (error) {
        log.error('scheduled-notification-rule-error', error.message, `Rule: ${rule.id}`);
      }
    });
  }

  return { check };
})();
