const TRIGGER_HANDLERS = {
  websitePublications: 'syncWebsitePublications',
  gigOptionExpiry: 'checkGigOptionExpiry',
  scheduledNotifications: 'checkScheduledNotifications',
  autoSync: 'syncEventsToCalendar',
  notificationWorker: 'processEventQueueNotifications',
  flightMailImport: 'scanFlightEmailsAndImport',
  hotelMailImport: 'scanHotelEmailsAndImport',
  systemStatus: 'refreshSystemStatus'
};
