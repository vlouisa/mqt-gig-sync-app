# WEB-001 — HTTP-response uitlezen

- Ernst: Laag
- Status: Opgelost
- Bestand/functie: `infrastructure/wordpress/wordpress-event-client.js`, `createDraft`.

De onafhankelijke implementatiereview constateerde dat `getResponseCode()` buiten de afgeschermde try/catch stond. Als die methode een uitzondering werpt, kon de ruwe tekst via de service in Last Error/log komen. Het optreden daarvan met een echte HTTPResponse is niet gereproduceerd; de onbeveiligde control flow was wel aanwezig.

Oplossing: lees de status binnen dezelfde catchgrens als fetch. De regressietest `testWebsiteResponseReadFailure` simuleert een exception met dummycredentials, controleert afscherming en blokkeert een tweede create. Geen live HTTP uitgevoerd.

De review noemde tevens het ontbreken van de externe WordPress-pluginwijziging. Dit is een bekende uitrolvoorwaarde uit het goedgekeurde plan, geen aanvullende lokale codefinding: inrichting vereist registratie van de twee contactvelden vóór gebruik en handmatige verificatie in WordPress. Zie `docs/website-publications.md`.
