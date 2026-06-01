function onOpen() {
  const log = logService.forModule('menu');
  const userEmail = Session.getActiveUser().getEmail();
  if (userEmail !== CONFIG.adminEmail) return;

  const ui = SpreadsheetApp.getUi();

  ui.createMenu('MQT Gig Sync')
    .addItem('Publiceer events naar Calendar', 'syncEventsToCalendar')

    .addSeparator()
    .addSubMenu(
      ui.createMenu('Import')
        .addItem('Scan en importeer vluchtgegevens', 'scanFlightEmailsAndImport')
        .addItem('Scan en importeer hotelgegevens', 'scanHotelEmailsAndImport')
    )

    .addSubMenu(
      ui.createMenu('Triggers')
        .addItem('Installeer auto-sync trigger', 'installAutoSyncTrigger')
        .addItem('Verwijder auto-sync trigger', 'removeAutoSyncTriggers')
        .addSeparator()
        .addItem('Installeer flight-mail-import trigger', 'installFlightMailImportTrigger')
        .addItem('Verwijder flight-mail-import trigger', 'removeFlightMailImportTriggers')
        .addSeparator()
        .addItem('Installeer hotel-mail-import trigger', 'installHotelMailImportTrigger')
        .addItem('Verwijder hotel-mail-import trigger', 'removeHotelMailImportTriggers')
        .addSeparator()
        .addItem('Installeer notificatie-worker trigger', 'installNotificationWorkerTrigger')
        .addItem('Verwijder notificatie-worker trigger', 'removeNotificationWorkerTriggers')
        .addSeparator()
        .addItem('Installeer systeemstatus trigger', 'installSystemStatusTrigger')
        .addItem('Verwijder systeemstatus trigger', 'removeSystemStatusTriggers')
    )

    .addSubMenu(
      ui.createMenu('Notificaties')
        .addItem('Verwerk notificatie queue', 'processEventQueueNotifications')
    )

    .addSubMenu(
      ui.createMenu('Systeem')
        .addItem('Bescherm technische kolommen', 'protectTechnicalColumns')
        .addItem('Ververs systeemstatus', 'refreshSystemStatus')
    )

    .addToUi();

  log.info('menu', 'on-open', 'MQT Gig Sync menu opgebouwd.');
}

