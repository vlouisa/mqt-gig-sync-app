/** Eén POST, uitsluitend na een handmatige actie. Geen automatische retries of redirects. */
const wordpressEventClient = (() => {
  /** Leest credentials pas bij de createactie; geen configuratiewaarden opnemen in errors. */
  function getConnection() {
    let baseUrl, username, applicationPassword;
    try {
      baseUrl = appPropertiesService.getWordPressBaseUrl().trim().replace(/\/+$/, '');
      username = appPropertiesService.getWordPressUsername().trim();
      applicationPassword = appPropertiesService.getWordPressApplicationPassword();
    } catch (error) {
      throw new Error('WordPress-configuratie ontbreekt; controleer de drie WORDPRESS_* Script Properties.');
    }
    // Apps Script V8 heeft geen browser-URL API nodig. Geen credentials/query/fragment in de URL.
    if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[a-z0-9._~%/-]*)?$/i.test(baseUrl) ||
        !username || username.includes(':') || !applicationPassword.trim()) {
      throw new Error('Ongeldige WordPress-configuratie; HTTPS en een geldige gebruikersnaam zijn verplicht.');
    }
    return { baseUrl, username, applicationPassword };
  }

  /**
   * @returns {{id: number, isDraft: boolean, draftUrl: string}} Bevestigde create-identiteit.
   * @throws {Error} Een veilige melding, nooit een responsebody, header of fetch-exception.
   */
  function createDraft(payload, connection) {
    if (payload.status !== 'draft') throw new Error('Uitsluitend WordPress-concepten zijn toegestaan.');
    let response, status;
    try {
      const credentials = Utilities.base64Encode(connection.username + ':' + connection.applicationPassword);
      response = UrlFetchApp.fetch(connection.baseUrl + '/wp-json/wp/v2/event', {
        method: 'post', contentType: 'application/json',
        headers: { Authorization: 'Basic ' + credentials, Accept: 'application/json' },
        payload: JSON.stringify(payload), muteHttpExceptions: true, followRedirects: false
      });
      status = response.getResponseCode();
    } catch (error) {
      throw new Error('Geen betrouwbare WordPress-response ontvangen. Controleer WordPress handmatig vóór herstel; niet opnieuw aanmaken.');
    }
    if (status !== 201) {
      const hints = {
        400: 'Controleer de invoer en de REST-registratie van de eventvelden.',
        401: 'Controleer gebruikersnaam en Application Password.',
        403: 'Controleer de rechten van het WordPress-account.',
        404: 'Controleer de base URL en de event REST-route.'
      };
      throw new Error(`WordPress HTTP ${Number(status)}. ${hints[status] || 'Geen bevestigde create.'} Controleer WordPress vóór herstel.`);
    }
    let body;
    try { body = JSON.parse(response.getContentText()); } catch (error) {
      throw new Error('WordPress gaf HTTP 201 met een onleesbare response. Controleer het aangemaakte event handmatig.');
    }
    if (!body || !Number.isSafeInteger(body.id) || body.id <= 0) {
      throw new Error('WordPress gaf HTTP 201 zonder geldig event-ID. Handmatige controle vereist.');
    }
    return {
      id: body.id, isDraft: body.status === 'draft' && body.type === 'event',
      draftUrl: connection.baseUrl + '/wp-admin/post.php?post=' + body.id + '&action=edit'
    };
  }

  return { getConnection, createDraft };
})();
