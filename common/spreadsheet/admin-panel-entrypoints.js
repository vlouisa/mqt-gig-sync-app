/** Opent de beheer-UI uitsluitend voor het ingestelde beheeraccount. */
function showAdminPanel() {
  showAdminPanel_('overview');
}

function showAdminPanel_(section) {
  assertAdminUser('Beheerpaneel openen');
  const template = HtmlService.createTemplateFromFile('common/spreadsheet/admin-panel');
  template.initialSection = section;
  SpreadsheetApp.getUi().showSidebar(template.evaluate().setTitle('MQT Gig Sync'));
}

/** Iedere browseraanroep controleert opnieuw de actieve gebruiker. */
function getAdminPanelSnapshot() {
  assertAdminUser('Beheeroverzicht bekijken');
  return adminPanelService.snapshot();
}

function runAdminPanelAction(id) {
  assertAdminUser('Beheeractie uitvoeren');
  return adminPanelService.execute(id);
}

function manageAdminPanelTrigger(id, operation) {
  assertAdminUser('Automatisering beheren');
  return adminPanelService.manageTrigger(id, operation);
}

function getAdminPanelSelection() {
  assertAdminUser('Publicatie bekijken');
  return adminPanelService.selection();
}

function runAdminPanelPublication(operation, expected) {
  assertAdminUser('Websitepublicatie verwerken');
  return adminPanelService.publication(operation, expected);
}

function showAdminHelp() {
  showAdminPanel_('help');
}
