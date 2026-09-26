# Reviewbevindingen

Review van het notificatiemechanisme op 26 september 2026. Applicatiecode en de
lokale repository `../mqt-sync-notification-library` zijn gelezen. De daadwerkelijk
gepubliceerde libraryversie en productieconfiguratie zijn niet gecontroleerd.
Er is ook een onafhankelijke review van de syncaanroepen uitgevoerd.

| ID | Ernst | Status | Bevinding | Details |
| --- | --- | --- | --- | --- |
| NOTIFY-001 | Hoog | Opgelost in code; tests nog niet uitgevoerd | Fout bij gigmelding na succesvolle sync breekt de synchronisatierun af | [Details](NOTIFY-001-gig-publication-failure.md) |
| NOTIFY-002 | Hoog | Opgelost; lokale unit-tests geslaagd | Foutnotificaties doorbreken foutisolatie per record | [Details](NOTIFY-002-error-notification-isolation.md) |
| NOTIFY-003 | Hoog | Open | Onderbroken queue-items op PROCESSING worden niet hersteld | [Details](NOTIFY-003-stuck-processing.md) |
| NOTIFY-004 | Middel | Open | Uurfingerprint verwart ochtend en avond | [Details](NOTIFY-004-hour-fingerprint.md) |

## Verificatie en beperkingen

- Na de oplossing van NOTIFY-002 is `npm.cmd run test:unit` uitgevoerd:
  **158 geslaagd, 0 mislukt**, inclusief de refactor naar `tryPublish`.
  De onderstaande toolingbeperking betreft de
  oorspronkelijke review. Zie het detailbestand voor de nieuwe regressiegevallen.

- Bevindingen zijn gebaseerd op de daadwerkelijke control flow en contracten;
  ze zijn niet in productie gereproduceerd.
- De lokale unit-runner en relevante mocks/tests zijn geïnspecteerd.
  `npm run test:unit` kon niet starten: npm en node zijn niet op PATH gevonden;
  ook `C:/Program Files/nodejs/node.exe` ontbreekt. Er is dus geen testuitslag.
- Geen integratietests, externe mutaties of deployments uitgevoerd.
- Tijdens de oorspronkelijke review is alleen documentatie toegevoegd. NOTIFY-001
  is daarna gericht opgelost; de details vermelden de wijziging en verificatie.
