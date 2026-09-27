/** Uitsluitend snapshots: dezelfde entrypoint voor menu en uurtrigger, zonder WordPress. */
function syncWebsitePublications() {
  return withWebsitePublicationLock_(() => websitePublicationSyncService.sync());
}

/** Expliciete beheeractie; bestaande Sheet-inhoud blijft behouden. */
function setupWebsitePublications() {
  assertAdminUser('Website-publicaties inrichten');
  withWebsitePublicationLock_(() => websitePublicationSheetService.setup());
}

/** Alleen handmatig; een installable trigger levert een eventobject aan en wordt geweigerd. */
function createWordPressDraft(event) {
  if (event) throw new Error('WordPress-concepten mogen uitsluitend handmatig worden aangemaakt.');
  assertAdminUser('WordPress-concept aanmaken');
  const message = withWebsitePublicationLock_(() => websitePublicationService.createSelectedDraft());
  // UI-dialogen pas na vrijgave van het lock.
  SpreadsheetApp.getUi().alert(message);
}

function skipWebsitePublication() {
  assertAdminUser('Website-publicatie overslaan');
  const message = withWebsitePublicationLock_(() => websitePublicationService.skipSelected());
  SpreadsheetApp.getUi().alert(message);
}

/** Installeer vanuit het vaste beheeraccount; vervang alleen de eigen website-trigger. */
function installWebsitePublicationTrigger() {
  assertAdminUser('Website-trigger installeren');
  withWebsitePublicationLock_(() => {
    const previous = ScriptApp.getProjectTriggers().filter(trigger =>
      trigger.getHandlerFunction() === TRIGGER_HANDLERS.websitePublications);
    ScriptApp.newTrigger(TRIGGER_HANDLERS.websitePublications).timeBased()
      .everyHours(CONFIG.websitePublications.everyHours).create();
    previous.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  });
  systemStatusService.update();
}

function removeWebsitePublicationTriggers() {
  assertAdminUser('Website-trigger verwijderen');
  withWebsitePublicationLock_(() => {
    ScriptApp.getProjectTriggers().filter(trigger =>
      trigger.getHandlerFunction() === TRIGGER_HANDLERS.websitePublications)
      .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  });
  systemStatusService.update();
}

/** Serialiseert create, skip, snapshots en bron-ID-toekenning met bestaande scriptworkflows. */
function withWebsitePublicationLock_(action) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Een andere verwerking is actief. Probeer later opnieuw.');
  try {
    return action();
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }
}
