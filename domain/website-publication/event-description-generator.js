/** Bouwt uitsluitend uit geselecteerde publicatiefeiten een Engelse AI-tekst. */
const eventDescriptionGenerator = (() => {
  function context(row) {
    const c = CONFIG.websitePublications.columns;
    const result = {};
    ['title', 'date', 'venue', 'city', 'country', 'address', 'zip', 'ticketUrl', 'price'].forEach(key => {
      let value = row[c[key]];
      if (value instanceof Date) {
        if (!Number.isFinite(value.getTime())) throw new Error('Ongeldige publicatiedatum.');
        const [year, month, day] = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd').split('-');
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        value = `${Number(day)} ${months[Number(month) - 1]} ${year}`;
      }
      result[key] = String(value ?? '').trim();
      if (result[key].length > 2000) throw new Error('Publicatieveld te lang voor AI-generatie.');
    });
    result.internalTitle = result.title;
    delete result.title;
    return result;
  }

  /** Beperkte signalen, geen bewijs van feitelijke of redactionele kwaliteit. */
  function qualityIssues_(text) {
    const issues = [];
    if (text.split(/\s+/).filter(Boolean).length < 70) issues.push('Too short: develop the announcement using the approved band context.');
    if (text.length > 8000 || /<\/?[a-z][^>]*>|```|^\s*#|\*\*|\[[^\]]+\]\([^)]+\)|event description\s*:|as an ai/im.test(text)) {
      issues.push('Return plain event copy without markup, explanation or AI disclosure.');
    }
    if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) issues.push('Use natural English dates, not ISO dates.');
    if (/^Miracle\b[^\n.!?]*\bcomes to\b/i.test(text) || /for more information,?\s+visit/i.test(text)) {
      issues.push('Replace the database-style opening or website closing with distinctive event copy.');
    }
    const prose = text.split('\n').filter(line => !/^\s*(venue|date|time|tickets?|doors open|miracle on stage|address|location)\s*:/i.test(line)).join(' ');
    if (prose.split(/\s+/).filter(Boolean).length < 50) issues.push('Add audience-facing prose beyond the practical information block.');
    return issues;
  }

  /** beforeRequest bewaakt het gedeelde HTTP-budget en controleert de rij opnieuw. */
  function generate(facts, settings, beforeRequest) {
    const instructions = eventCopyGuidelinesProvider.get();
    let issues = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      beforeRequest();
      const input = { eventData: facts };
      if (issues.length) input.qualityFeedback = issues;
      const text = String(openaiTextClient.generate(instructions, input, settings) || '').replace(/\r\n?/g, '\n').trim();
      issues = qualityIssues_(text);
      if (!issues.length) return text;
    }
    throw new Error('AI-antwoord na kwaliteitscontrole afgewezen.');
  }
  return { context, generate };
})();
