/** Eén Responses-aanvraag; geen retries, responsebodies of credentials in fouten. */
const openaiTextClient = (() => {
  function generate(instructions, context, settings) {
    let response;
    try {
      response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
        method: 'post', contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + settings.apiKey },
        muteHttpExceptions: true, followRedirects: false,
        payload: JSON.stringify({ model: settings.model, store: false,
          instructions, input: JSON.stringify(context), max_output_tokens: 1200,
          reasoning: { effort: 'none' } })
      });
      const status = response.getResponseCode();
      if (status !== 200) {
        const error = new Error('AI-aanvraag mislukt.');
        error.stopRun = [400, 401, 403, 404, 429].includes(status);
        throw error;
      }
      const body = JSON.parse(response.getContentText());
      if (body.status !== 'completed' || !Array.isArray(body.output)) throw new Error('Onvolledig antwoord.');
      const parts = body.output.filter(item => item.type === 'message').flatMap(item => item.content || []);
      if (parts.some(part => part.type === 'refusal')) throw new Error('Geweigerd antwoord.');
      return parts.filter(part => part.type === 'output_text').map(part => part.text).join('\n\n');
    } catch (error) {
      const safe = new Error('AI-aanvraag niet afgerond; beschrijving blijft leeg.');
      safe.stopRun = error.stopRun === true;
      throw safe;
    }
  }
  return { generate };
})();
