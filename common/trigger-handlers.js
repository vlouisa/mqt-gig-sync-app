const TRIGGER_HANDLERS = {
  websitePublications: 'syncWebsitePublications',
  scheduledNotifications: 'checkScheduledNotifications',
  autoSync: 'syncEventsToCalendar',
  notificationWorker: 'processEventQueueNotifications',
  flightMailImport: 'scanFlightEmailsAndImport',
  hotelMailImport: 'scanHotelEmailsAndImport',
  systemStatus: 'refreshSystemStatus'
};
