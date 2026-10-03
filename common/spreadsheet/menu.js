/** Bouwt het compacte spreadsheetmenu uitsluitend voor het actieve beheeraccount. */
function onOpen() {
  if (Session.getActiveUser().getEmail() !== CONFIG.adminEmail) return;
  SpreadsheetApp.getUi().createMenu('MQT Gig Sync')
    .addItem('Open beheerpaneel', 'showAdminPanel')
    .addItem('Publiceer events naar Calendar', 'syncEventsToCalendar')
    .addSeparator()
    .addItem('Help', 'showAdminHelp')
    .addToUi();
  logService.forModule('menu').info('menu', 'on-open', 'MQT Gig Sync menu opgebouwd.');
}
