/** Compatibiliteit voor bestaande callers; nieuwe controles gebruiken alle regels. */
const gigOptionExpiryService = (() => {
  function check(now = new Date()) {
    scheduledNotificationService.check(now,
      scheduledNotificationRules.getAll().filter(rule => rule.id === 'gigOptionExpiresToday'));
  }
  return { check };
})();
