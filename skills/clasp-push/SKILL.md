---

name: clasp-push
description: Push gereviewde lokale MQT Gig Sync Apps Script-code veilig met clasp. Gebruik deze skill wanneer de gebruiker expliciet vraagt om clasp push.
-----------------------------------------------------------------------------------------------------------------------------------------------------------

# Clasp push

Push de reeds gereviewde lokale Apps Script-code naar het gekoppelde Apps Script-project.

## Werkwijze

1. Voer geen nieuwe inhoudelijke codewijzigingen uit.
2. Controleer dat de lokale toestand geschikt is om te pushen.
3. Voer `clasp push` uit.
4. Rapporteer of de push succesvol was.

## Authenticatie

Wanneer `clasp` authenticatie vereist:

* laat de gebruiker zelf de interactieve OAuth-flow met `clasp login` voltooien;
* lees, toon, kopieer of wijzig `.clasprc.json` niet;
* probeer authenticatie niet met alternatieve credentials te omzeilen;
* rapporteer authenticatiefouten zonder tokens of andere secrets te tonen.
