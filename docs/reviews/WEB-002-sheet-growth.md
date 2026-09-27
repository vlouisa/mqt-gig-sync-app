# WEB-002 — Bewerkbare kolommen bij uitbreiding

- Ernst: Laag
- Status: Opgelost
- Bestand/functie: `domain/website-publication/website-publication-sheet-service.js`, `append`.

De onafhankelijke implementatiereview constateerde dat toevoeging voorbij de laatste fysieke Sheet-rij de beschermingsuitzonderingen niet expliciet vernieuwde. Daardoor hing bewerkbaarheid van de nieuwe rij af van Google Sheets' automatische uitbreiding van beschermingsbereiken; dit gedrag is niet live geverifieerd.

Oplossing: pas na fysieke rijtoevoeging de bestaande inrichting opnieuw toe. De vijf bewerkbare kolommen omvatten dan expliciet ook de nieuwe rij. `testWebsiteSheetSetupAndSchema` forceert een vol tabblad en controleert de nieuwe uitzonderingsbereiken. De overige technische kolommen blijven beschermd.
