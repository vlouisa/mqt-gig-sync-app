/** Controleert vervallende gigopties onder hetzelfde scriptlock als de queue-worker. */
function checkGigOptionExpiry() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    logService.forModule('trigger-service').warn('gig-option-expiry-skipped-lock',
      'Optiecontrole overgeslagen: scriptlock bezet.', '');
    return;
  }
  try {
    gigOptionExpiryService.check();
  } finally {
    lock.releaseLock();
  }
}

/** Legacy entrypoint: migreert de optiecontrole naar de generieke notificatiecontrole. */
function installGigOptionExpiryTrigger() {
  installScheduledNotificationTrigger();
}

/** Evalueert alle tijdgestuurde regels onder een scriptlock. */
function checkScheduledNotifications() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    logService.forModule('trigger-service').warn('scheduled-notifications-skipped-lock',
      'Notificatiecontrole overgeslagen: scriptlock bezet.', '');
    return;
  }
  try {
    scheduledNotificationService.check();
  } finally {
    lock.releaseLock();
  }
}

/** Installeert de generieke controle en vervangt ook legacy optietriggers. */
function installScheduledNotificationTrigger() {
  const hours = CONFIG.notifications.schedule.everyHours;
  if (![1, 2, 4, 6, 8, 12].includes(hours)) {
    throw new Error('Ongeldig controle-interval voor notificaties.');
  }
  // Bij een create-fout blijft de bestaande controle actief.
  const previous = ScriptApp.getProjectTriggers().filter(trigger =>
    [TRIGGER_HANDLERS.scheduledNotifications, TRIGGER_HANDLERS.gigOptionExpiry]
      .includes(trigger.getHandlerFunction()));
  ScriptApp.newTrigger(TRIGGER_HANDLERS.scheduledNotifications)
    .timeBased().everyHours(hours).create();
  previous.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  systemStatusService.update();
}

/** Verwijdert generieke en legacy tijdgestuurde notificatiecontroles. */
function removeScheduledNotificationTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if ([TRIGGER_HANDLERS.scheduledNotifications, TRIGGER_HANDLERS.gigOptionExpiry]
      .includes(trigger.getHandlerFunction())) ScriptApp.deleteTrigger(trigger);
  });
  systemStatusService.update();
}

/** Verwijdert uitsluitend triggers voor de optiecontrole. */
function removeGigOptionExpiryTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLERS.gigOptionExpiry) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  systemStatusService.update();
}

/**
 * Verwerkt pending notificaties uit de event-queue.
 */
function processEventQueueNotifications() {
  initNotifications();
  Notify.notificationWorker.process();
}

/**
 * Installeert de 1-minuut time-based trigger voor de notificatie-worker.
 *
 * Verwijdert eerst bestaande notificatie-worker triggers om dubbele
 * queue-verwerking te voorkomen.
 *
 * @returns {void}
 */
function installNotificationWorkerTrigger() {
  const log = logService.forModule('trigger-service');

  removeNotificationWorkerTriggers();

  ScriptApp.newTrigger(TRIGGER_HANDLERS.notificationWorker)
    .timeBased()
    .everyMinutes(1)
    .create();

  systemStatusService.update();
  log.info(
    'notification-worker-trigger-installed',
    'Notificatie-worker trigger geïnstalleerd.',
    'Interval: 1 minuut'
  );
}

/**
 * Verwijdert alle bestaande notificatie-worker triggers.
 *
 * @returns {void}
 */
function removeNotificationWorkerTriggers() {
  const log = logService.forModule('trigger-service');

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === TRIGGER_HANDLERS.notificationWorker) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  systemStatusService.update();
  log.info(
    'notification-worker-trigger-removed',
    'Notificatie-worker trigger(s) verwijderd.',
    ''
  );
}

/**
 * Controleert of exact één notificatie-worker trigger bestaat.
 *
 * Als er geen trigger of meerdere triggers bestaan, wordt de trigger opnieuw opgebouwd.
 *
 * @returns {void}
 */
function ensureNotificationWorkerTrigger() {
  const log = logService.forModule('trigger-service');

  const count = ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === TRIGGER_HANDLERS.notificationWorker)
    .length;

  if (count === 1) {
    log.info(
      'notification-worker-trigger-ok',
      'Notificatie-worker trigger is actief.',
      ''
    );
    return;
  }

  if (count > 1) {
    log.warn(
      'notification-worker-trigger-duplicate',
      'Meerdere notificatie-worker triggers gevonden. Triggers worden opnieuw opgebouwd.',
      `Aantal: ${count}`
    );
  }

  installNotificationWorkerTrigger();
}
