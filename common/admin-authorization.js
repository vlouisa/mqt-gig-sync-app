/**
 * Controleert het actieve gebruikersadres tegen CONFIG.adminEmail.
 *
 * @param {string} action Naam van de beheeractie voor logging en foutmelding.
 * @returns {void}
 * @throws {Error} Bij een afwijkend adres.
 */
function assertAdminUser(action) {
  const userEmail = Session.getActiveUser().getEmail();

  if (userEmail !== CONFIG.adminEmail) {
    logService.forModule('trigger-service').warn('unauthorized-action', 'Niet-admin probeerde beheeractie uit te voeren.', `Action: ${action}, User: ${userEmail}`);
    throw new Error(`Alleen ${CONFIG.adminEmail} mag '${action}'.`);
  }
}
