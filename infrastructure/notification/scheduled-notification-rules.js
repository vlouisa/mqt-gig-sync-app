/** Register van tijdgestuurde notificatieregels; implementaties staan in rules/. */
const scheduledNotificationRules = (() => {
  /**
   * Leest actuele configuratie via de getters van iedere rule.
   * @returns {Object[]} Nieuwe definities zodat callers de rule-objecten niet wijzigen.
   */
  function getAll() {
    return [gigOptionExpiresTodayRule, gigInvoiceNeedsToBeSentRule].map(rule => ({
      ...rule,
      requiredColumns: [...rule.requiredColumns]
    }));
  }

  return { getAll };
})();
