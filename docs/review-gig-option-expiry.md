# Reviewbevinding: notificatie bij vervallende gigopties

- **Gereviewde commit:** `eede0f7`
- **Ernst:** Middel
- **Status:** Open, nog niet opgelost

## Ongeldige gigdatum blokkeert een geldige vervalmelding

In `infrastructure/notification/notification-message-factory.js`, functie
`createGigOptionExpiresTodayMessage_()` (regel 52 in de gereviewde commit), wordt
de optreedatum via `formatDate_(payload.date)` geformatteerd zonder controle op
een ongeldige datum.

De optiecontrole in `domain/gig/gig-option-expiry-service.js` controleert de
boekingsstatus, technische verwijderstatus, vervaldatum, het meldtijdstip en
de aanwezigheid van een Gig ID. Een ongeldige optreedatum sluit de gig niet uit.

### Omstandigheden en gevolg

Een gig met `Gig Status = OPTION`, een Gig ID en een vervaldatum van vandaag kan
bijvoorbeeld `Date = "t.b.d."` bevatten. Zodra het meldtijdstip is bereikt:

1. De gig voldoet aan de selectievoorwaarden.
2. De berichtfactory zet de optreedatum om met `new Date(value)`, wat een
   ongeldige datum oplevert.
3. `Utilities.formatDate()` kan deze datum niet formatteren; de berichtopbouw faalt.
4. De optiecontrole logt de fout per gig, maar er wordt geen notificatie klaargezet.

Zolang de optreedatum ongeldig blijft, mislukken ook volgende controles. Na de
vervaldag wordt de melding niet meer ingehaald. Een lege optreedatum wordt al
correct afgehandeld met `-`; de bevinding betreft een niet-lege ongeldige waarde.

### Gerichte oplossingsrichting

Gebruik in het vervalbericht een fallback zoals `-` voor een ongeldige optreedatum,
zodat dit informatieve veld de vervalmelding niet blokkeert. Houd de wijziging
gericht; bij aanpassing van de gedeelde datumformatter moet ook het effect op
andere notificatietemplates worden gecontroleerd.

Voeg een regressietest toe die een verder geldige optie met een ongeldige
optreedatum door de controle en berichtopbouw laat lopen en verifieert dat een
melding met de fallback wordt klaargezet.

## Reviewcontext en verificatie

De review omvatte een onafhankelijke beoordeling door een ander model en
inspectie van de lokale `Notify`-library. Verder zijn geen concrete findings
gevonden.

De tests zijn tijdens de review geïnspecteerd, niet opnieuw uitgevoerd. De
voorafgaande run had 143 geslaagde unit-tests; het beschreven foutpad ontbreekt
in die tests. Live Sheet-validatie en de remote libraryversie zijn niet
geverifieerd. De bevinding is gebaseerd op het uitvoeringspad in de code en is
niet met echte Google-services gereproduceerd.
