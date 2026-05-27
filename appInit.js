/**
 * Initialiseert de notificatie-library.
 */
function initNotifications() {
  Notify.initNotificationLibrary(CONFIG, {sheetService, notificationMessageFactory, propertiesService: PropertiesService.getScriptProperties()});
}