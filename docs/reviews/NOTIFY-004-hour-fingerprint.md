# NOTIFY-004 — Uurfingerprint verwart ochtend en avond

- Ernst: **Middel**
- Status: **Open**
- Zekerheid: **Bewezen uit formaatcontract en deduplicatiesleutel**.
- Locatie: `common/sync-failed-notification-message.js:73`,
  `formatFingerprintDate_`; ook regel 51, `formatDate_`.

## Probleem en gevolg

De fingerprint bevat `dd-MM-yyyy hh`. `hh` is een 12-uursklok zonder AM/PM.
Op dezelfde datum leveren 08:00 en 20:00 daardoor dezelfde uurwaarde op. Als
eventcode, bron-ID, fouttekst en ontvanger gelijk zijn en de eerdere queue-entry
bewaard is, onderdrukt Notify de avondmelding als duplicaat van de ochtendmelding.
Dit wijkt af van de bedoelde groepering per uur. Ook het zichtbare fouttijdstip
gebruikt `hh:mm:ss` zonder AM/PM en is daardoor dubbelzinnig.

## Gerichte oplossing

Gebruik `HH` voor de 24-uursnotatie in zowel fingerprint als berichttijdstip.
Controleer bij invoering het effect op bestaande queue-ID's: gewijzigde
fingerprints kunnen tijdens de overgang een extra melding veroorzaken.

## Verificatie

Google specificeert dat `Utilities.formatDate` de Java SimpleDateFormat-notatie
gebruikt; daarin betekent `h` uur 1-12 en `H` uur 0-23:
[Google Utilities](https://developers.google.com/apps-script/reference/utilities/utilities#formatDate(Date,String,String)),
[Java SimpleDateFormat](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/text/SimpleDateFormat.html).

De lokale formatterstub retourneert een vaste waarde voor `dd-MM-yyyy hh` en
test het werkelijke ochtend-/avondverschil niet. Voeg een regressie toe voor
dezelfde fout om 08:xx en 20:xx op dezelfde dag, naast deduplicatie binnen één
uur. Er zijn tijdens deze review geen tests uitgevoerd.
