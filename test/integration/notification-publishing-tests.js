/**
 * Handmatige integratiehulpen met echte services; expliciete toestemming vereist.
 * Kunnen Sheets, Gmail-labels, API-cache of notificatiequeue wijzigen, afhankelijk
 * van de aangeroepen service. Eerdere mutaties worden niet teruggedraaid bij fouten.
 */
/**
 * Test het publiceren van een gig-notificatie naar de event-queue.
 *
 * Vereist:
 * - bestaande event-list rij voor GIG_PUBLISHED
 * - actieve event-subscription voor minimaal één user
 * - geldige kolommen in event-queue
 *
 * @returns {void}
 */
function testPublishGigPublishedNotification() {
  initNotifications();

  const payload = {
    sourceId: Utilities.getUuid(),
    notificationFingerprint: Utilities.getUuid(),
    title: 'Test gig',
    date: new Date(),
    start: '20:00',
    end: '22:30',
    location: 'Test venue',
    description: 'Test notificatie vanuit Apps Script.',
    soundEngineer: 'Test engineer'
  };

  Notify.notificationPublisher.publish('GIG_PUBLISHED', payload);
}

/**
 * Test het verwerken van pending notificaties uit de event-queue.
 *
 * Gebruik bij voorkeur eerst met CONFIG.notifications.provider = 'MOCK'.
 *
 * @returns {void}
 * Verwerkt echte queue-rijen, ook met MOCK; andere providers kunnen echte berichten versturen.
   * Alleen uitvoeren met expliciete toestemming; dit is geen geïsoleerde unit-test.
   */
function testProcessEventQueueNotifications() {
  processEventQueueNotifications();
}

/**
 * Publiceert meerdere testnotificaties met unieke fingerprints.
 *
 * @returns {void}
 */
function testPublishMultipleGigPublishedNotifications() {
  testPublishGigPublishedNotification();
  testPublishGigPublishedNotification();
  testPublishGigPublishedNotification();
}