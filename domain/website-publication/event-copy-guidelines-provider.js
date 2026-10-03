/** Geeft de uit Markdown gebouwde runtime-resource terug, zonder runtime-bestandstoegang. */
const eventCopyGuidelinesProvider = (() => {
  function get() {
    if (typeof EVENT_COPY_GUIDELINES_RESOURCE === 'undefined' || !EVENT_COPY_GUIDELINES_RESOURCE ||
        typeof EVENT_COPY_GUIDELINES_RESOURCE.text !== 'string' || !EVENT_COPY_GUIDELINES_RESOURCE.text.trim()) {
      const error = new Error('Event-copy guidelines ontbreken. Bouw en deploy de runtime-resource.');
      error.stopRun = true;
      error.code = 'guidelines-missing';
      throw error;
    }
    return EVENT_COPY_GUIDELINES_RESOURCE.text;
  }
  return { get };
})();
