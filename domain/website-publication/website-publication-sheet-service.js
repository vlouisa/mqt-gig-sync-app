/** Headergestuurde toegang en inrichting van de websitewerkvoorraad. */
const websitePublicationSheetService = (() => {
  /** Maakt uitsluitend een ontbrekend tabblad aan; bestaande inhoud wordt nooit herbouwd. */
  function ensureSheet() {
    const config = CONFIG.websitePublications;
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(config.sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(config.sheetName);
      sheet.getRange(1, 1, 1, Object.keys(config.columns).length)
        .setValues([Object.values(config.columns)]);
      sheet.setFrozenRows(1);
      sheetService.clearColumnIndexMapCache(config.sheetName);
      configureSheet_(sheet);
    }
    validateHeaders_(sheet);
    return sheet;
  }

  /** Inrichting expliciet vanuit het menu; nooit bestaande publicatiewaarden wissen. */
  function setup() {
    const config = CONFIG.websitePublications;
    const existing = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(config.sheetName);
    if (existing) {
      const expected = Object.values(config.columns);
      const legacy = expected.filter(header => header !== config.columns.googleMapsEmbed);
      const actual = sheetService.getHeaders(existing);
      const index = expected.indexOf(config.columns.googleMapsEmbed);
      if (actual.length === legacy.length && actual.every((value, i) => value === legacy[i])) {
        // Alleen het bekende oude schema migreren; geen bestaande cellen herschrijven.
        existing.insertColumnAfter(index);
        existing.getRange(1, index + 1).setValue(config.columns.googleMapsEmbed);
        sheetService.clearColumnIndexMapCache(config.sheetName);
      } else if (actual.length === expected.length && actual[index] === '' &&
          actual.every((value, i) => i === index || value === expected[i]) &&
          existing.getRange(2, index + 1, existing.getMaxRows() - 1, 1).getValues().every(row => row[0] === '')) {
        // Herstel een onderbroken migratie na insertColumnAfter, vóór de headerwrite.
        existing.getRange(1, index + 1).setValue(config.columns.googleMapsEmbed);
        sheetService.clearColumnIndexMapCache(config.sheetName);
      }
    }
    const sheet = ensureSheet();
    configureSheet_(sheet);
  }

  function configureSheet_(sheet) {
    const config = CONFIG.websitePublications;
    const keys = Object.keys(config.columns);
    keys.forEach((key, index) => {
      const format = key === 'date' ? 'dd-MM-yyyy' : key === 'start' ? 'HH:mm' : '@';
      sheet.getRange(2, index + 1, sheet.getMaxRows() - 1, 1).setNumberFormat(format);
    });
    const description = 'Website publications: bron- en technische velden';
    let protection = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)
      .find(item => item.getDescription() === description);
    if (!protection) protection = sheet.protect().setDescription(description);
    protection.setWarningOnly(false);
    protection.addEditor(CONFIG.adminEmail);
    protection.removeEditors(protection.getEditors().filter(editor => editor.getEmail() !== CONFIG.adminEmail));
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
    protection.setUnprotectedRanges(config.editableColumnKeys.map(key =>
      sheet.getRange(2, keys.indexOf(key) + 1, sheet.getMaxRows() - 1, 1)));
  }

  function validateHeaders_(sheet) {
    const expected = Object.values(CONFIG.websitePublications.columns);
    const actual = sheetService.getHeaders(sheet);
    if (actual.length !== expected.length || actual.some((value, i) => value !== expected[i])) {
      throw new Error('website-publications heeft niet de verwachte 18 headers in de juiste volgorde. Voer de website-inrichtingsactie uit voor het oude schema.');
    }
  }

  function getRows() {
    ensureSheet();
    return sheetService.getRowsAsObjects(CONFIG.websitePublications.sheetName);
  }

  /** Zoekt opnieuw op identiteit, ook na een HTTP-call; vertrouw niet op een oud rijnummer. */
  function getByGigId(gigId) {
    const rows = getRows().filter(row => String(row[CONFIG.websitePublications.columns.gigId]) === String(gigId));
    if (rows.length !== 1) throw new Error('Gig ID ontbreekt of komt meerdere keren voor in website-publications.');
    return rows[0];
  }

  /** Schrijft alleen genoemde velden met een verse kolommap, niet de hele snapshot. */
  function update(gigId, values) {
    const sheet = ensureSheet();
    const row = getByGigId(gigId);
    const columns = CONFIG.websitePublications.columns;
    const map = sheetService.getColumnIndexMap(sheetService.getHeaders(sheet));
    Object.keys(values).forEach(key => {
      if (!columns[key]) throw new Error('Onbekend publicatieveld.');
      sheet.getRange(row.rowNumber, map[columns[key]]).setValue(asCellValue_(values[key]));
    });
  }

  /** Bewaar tekst als tekst, ook wanneer deze met een formuleteken begint. */
  function asCellValue_(value) {
    return typeof value === 'string' && value.startsWith('=') ? "'" + value : value;
  }

  function append(values) {
    const sheet = ensureSheet();
    const keys = Object.keys(CONFIG.websitePublications.columns);
    const rowNumber = sheet.getLastRow() + 1;
    if (rowNumber > sheet.getMaxRows()) {
      sheet.insertRowsAfter(sheet.getMaxRows(), 1);
      configureSheet_(sheet);
    }
    keys.forEach((key, index) => {
      sheet.getRange(rowNumber, index + 1).setNumberFormat(
        key === 'date' ? 'dd-MM-yyyy' : key === 'start' ? 'HH:mm' : '@');
    });
    sheet.getRange(rowNumber, 1, 1, keys.length)
      .setValues([keys.map(key => asCellValue_(values[key] ?? ''))]);
  }

  /** Alleen één actieve dataregel; headers, andere tabbladen en multiselectie zijn ongeldig. */
  function getSelected() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const selection = spreadsheet.getActiveRangeList();
    const ranges = selection ? selection.getRanges() : [];
    if (ranges.length !== 1) throw new Error('Selecteer precies één publicatieregel.');
    const range = ranges[0];
    if (range.getSheet().getName() !== CONFIG.websitePublications.sheetName ||
        range.getNumRows() !== 1 || range.getRow() < 2) {
      throw new Error('Selecteer één dataregel in website-publications.');
    }
    const row = getRows().find(item => item.rowNumber === range.getRow());
    if (!row || !row[CONFIG.websitePublications.columns.gigId]) throw new Error('De geselecteerde regel heeft geen Gig ID.');
    return getByGigId(row[CONFIG.websitePublications.columns.gigId]);
  }

  return { ensureSheet, setup, getRows, getByGigId, update, append, getSelected };
})();
