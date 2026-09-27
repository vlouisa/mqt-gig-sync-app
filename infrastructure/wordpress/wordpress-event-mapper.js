/** Zuivere omzetting van publicatievelden naar de bewezen Wolf Events REST-payload. */
const wordpressEventMapper = (() => {
  function text_(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  /** @throws {Error} Bij ontbrekende titel, ongeldige Sheet-datum of ongeldige tijd. */
  function map(row) {
    const c = CONFIG.websitePublications.columns;
    if (!text_(row[c.title]).trim()) throw new Error('Title is verplicht.');
    const date = row[c.date];
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('Date moet een geldige Sheet-datum zijn.');
    const zone = Session.getScriptTimeZone();
    let time = row[c.start];
    if (time instanceof Date && Number.isFinite(time.getTime())) {
      time = Utilities.formatDate(time, zone, 'HH:mm');
    } else {
      const match = text_(time).trim().match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
      if (!match) throw new Error('Start moet een geldige tijd zijn (HH:mm).');
      time = match[1].padStart(2, '0') + ':' + match[2];
    }
    return {
      title: text_(row[c.title]), status: 'draft', we_artist: [13],
      meta: {
        _wolf_event_start_date: Utilities.formatDate(date, zone, 'dd-MM-yyyy'),
        _wolf_event_venue: text_(row[c.venue]),
        _wolf_event_city: text_(row[c.city]),
        _wolf_event_country_short: text_(row[c.country]),
        _wolf_event_country: '',
        _wolf_event_time: time,
        _wolf_event_address: text_(row[c.address]),
        _wolf_event_zip: text_(row[c.zip]),
        _wolf_event_email: text_(row[c.contactEmail]),
        _wolf_event_website: text_(row[c.contactWebsite]),
        _wolf_event_ticket: text_(row[c.ticketUrl]),
        _wolf_event_price: text_(row[c.price]),
        _wolf_event_currency: 'EUR'
      }
    };
  }
  return { map };
})();
