# AGENTS.md

## Project

Deze repository bevat de Google Apps Script-applicatie voor **Miracle Queen Tribute Gig Sync**.

Google Sheets is de administratieve bron voor optredens, vluchten, hotels en niet-beschikbaarheid. De applicatie synchroniseert gegevens met Google Calendar, importeert gegevens uit Gmail en publiceert notificaties.

Beschouw de repository als bron van waarheid voor actuele structuur en gedrag.

---

## Kernregels

Behoud bestaand gedrag tenzij de gevraagde wijziging dit expliciet verandert.

Wijzig geen niet-gerelateerde code, publieke contracten, Sheet-schema's of statusovergangen als onderdeel van een andere wijziging.

Introduceer geen nieuwe architectuurpatronen uitsluitend voor uniformiteit.

---

## Runtime

Dit is een **Google Apps Script V8**-project.

Ga er niet vanuit dat Node.js- of browser-API's tijdens de Apps Script-runtime beschikbaar zijn.

Globale entrypoints kunnen vanuit spreadsheetmenu's en geïnstalleerde triggers bij naam worden aangeroepen. Mappen vormen binnen Apps Script geen JavaScript-namespaces.

Er is een lokale Node.js-unit-testrunner voor geïsoleerde unit-tests.

---

## Architectuur

Services gebruiken doorgaans een IIFE-gebaseerd modulepatroon met een expliciet publiek return-object. Afhankelijkheden worden meestal via globale namen gebruikt.

Technische logging en auditlogging hebben verschillende verantwoordelijkheden en blijven gescheiden.

---

## Externe MQT-libraries

Gig Sync gebruikt externe Google Apps Script-libraries, waaronder:

* `Flight` — parsing van vluchtmails;
* `Hotel` — parsing van hotelmails;
* `Notify` — aflevering van notificaties.

Deze implementaties worden buiten deze repository beheerd.

Respecteer hun publieke contracten en dupliceer hun implementatielogica niet in Gig Sync.

Wanneer een wijziging afhankelijk is van gedrag van een externe library, inspecteer de betreffende library-repository wanneer deze beschikbaar is. Benoem anders expliciet welk gedrag niet kon worden geverifieerd.

---

## Sheets en synchronisatie

Google Sheets bevat operationele data en vormt een belangrijk applicatiecontract.

Gebruik bestaande `CONFIG`-waarden en headergestuurde toegang waar deze beschikbaar zijn.

Wijzigingen aan Sheet-headers, statussen en statusovergangen zijn potentieel breaking.

De primaire synchronisatierichting is:

```text
Google Sheets
    ↓
Google Calendar
```

Introduceer geen Calendar-naar-Sheets-synchronisatie of nieuwe synchronisatiestatussen zonder expliciete functionele noodzaak.

Datum- en tijdwaarden kunnen per domein verschillende betekenissen hebben. Controleer de bestaande semantiek voordat datum- of tijdlogica wordt gewijzigd.

---

## Side effects en foutafhandeling

Behoud bij synchronisatie waar mogelijk isolatie per record.

Houd rekening met externe side effects op Sheets, Calendar, Gmail, notificaties, API's, caches en externe MQT-libraries.

Introduceer retrygedrag alleen nadat risico's op dubbele side effects zijn geanalyseerd.

---

## Secrets

Hardcode, log, commit of toon nooit credentials, API-keys, OAuth-tokens of andere secrets.

Gebruik bestaande veilige configuratiemechanismen zoals Script Properties.

Lees, toon, kopieer of wijzig `.clasprc.json` niet.

Neem echte credentials niet op in tests, fixtures, prompts, documentatie of foutmeldingen.

---

## Veilig testen

Voer nooit zonder expliciete toestemming tests of diagnostische functies uit die mogelijk productiegegevens of externe toestand wijzigen, waaronder Sheets, Calendar, Gmail, notificaties, externe API's, caches of andere persistente toestand.

Een functie met `test` in de naam is niet automatisch veilig. Inspecteer bij twijfel eerst de test en zijn afhankelijkheden.

---

## Git en deployment

Voer geen `git commit`, `git push`, `clasp push`, `clasp deploy`, `clasp redeploy` of andere remote- of deploymenthandeling uit zonder expliciete opdracht van de gebruiker.

---

## Codestijl

Volg primair de stijl van de bestaande bestanden die worden gewijzigd.

Belangrijke conventies:

* Engelse identifiers;
* voornamelijk Nederlandse comments en JSDoc;
* `camelCase` voor functies en variabelen;
* `PascalCase` voor klassen;
* `UPPER_SNAKE_CASE` voor constanten en statussen;
* afsluitende `_` voor interne helperfuncties waar dit patroon wordt gebruikt;
* JSDoc voor relevante publieke contracten en foutvoorwaarden.

Voer geen formatting-only wijzigingen uit in bestanden die niet bij de taak betrokken zijn.

## Reporting

Wanneer je een taak uitvoert:

- vermeld aan het einde welke lokale skills je hebt gebruikt;
- vermeld alleen skills die je daadwerkelijk hebt ingelezen/toegepast;
- als geen skill is gebruikt, vermeld dat expliciet;
- noem kort relevante bijzonderheden, zoals mislukte commando's, retries, ontbrekende tooling of een independent review.