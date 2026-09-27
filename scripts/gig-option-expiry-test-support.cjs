/** Uitsluitend in-memory mocks voor de optiecontrole. */
module.exports = `
  const unit = { rows: [], queued: [], errors: [], acquired: true, releases: 0,
    checks: 0, fail: false, reads: 0, headers: ['Option Expiry Date', 'Gig ID', 'Gig Status', 'SyncStatus', 'Date'], triggers: [], updates: 0 };
  const appPropertiesService = { getCalendarId: () => 'test', getAdminEmail: () => 'test@example.invalid' };
  const Session = { getScriptTimeZone: () => 'Europe/Brussels' };
  const Utilities = { formatDate(date, zone, pattern) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).map(part => [part.type, part.value]));
    if (pattern === 'HH:mm') return parts.hour + ':' + parts.minute;
    if (pattern === 'dd-MM-yyyy') return parts.day + '-' + parts.month + '-' + parts.year;
    return parts.year + '-' + parts.month + '-' + parts.day;
  } };
  const logService = { forModule: () => ({ warn() {}, info() {},
    error(...args) { unit.errors.push(args); } }) };
  unit.travel = { 'flight-input': [], 'hotel-input': [] };
  unit.sourceReads = {};
  const sheetService = { getSheet: name => ({ name }), getHeaders: sheet => {
    if (sheet.name === 'flight-input') return unit.flightHeaders || Object.values(CONFIG.entities.flight.columns);
    if (sheet.name === 'hotel-input') return Object.values(CONFIG.entities.hotel.columns);
    return unit.headers;
  }, getRowsAsObjects: name => {
    unit.sourceReads[name] = (unit.sourceReads[name] || 0) + 1;
    if (name !== 'gig-input') return unit.travel[name];
    unit.reads++; return unit.rows;
  } };
  function initNotifications() {}
  const Notify = {
    notificationFingerprintService: { create: values => JSON.stringify(values) },
    notificationPublisher: { publish(event, payload) {
      if (payload.sourceId === 'fail') throw new Error('Publicatie mislukt');
      unit.queued.push({ event, payload });
    } }
  };
  const LockService = { getScriptLock: () => ({ tryLock: () => unit.acquired,
    releaseLock() { unit.releases++; } }) };
  const systemStatusService = { update() { unit.updates++; } };
  const ScriptApp = {
    getProjectTriggers: () => unit.triggers.map(name => ({ getHandlerFunction: () => name })),
    deleteTrigger(trigger) { unit.triggers.splice(unit.triggers.indexOf(trigger.getHandlerFunction()), 1); },
    newTrigger(name) { return { timeBased() { return this; },
      everyHours(hours) { unit.hours = hours; return this; },
      create() { unit.triggers.push(name); } }; }
  };
`;
