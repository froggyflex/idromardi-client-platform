const { createPortalAccount, findMatchingUser } = require('../services/registrationService');
const { normalizeRegistrationPayload, validateRegistrationPayload } = require('../utils/registrationValidation');

async function requestRegistration(req, res, next) {
  try {
    const payload = normalizeRegistrationPayload(req.body);
    const validationError = validateRegistrationPayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const matchedUser = await findMatchingUser(payload);

    if (!matchedUser) {
      return res.status(404).json({
        message:
          'Non abbiamo trovato una corrispondenza con i dati inseriti. Se il codice fiscale non e presente in archivio, inserisci anche interno, matricola contatore o cellulare.',
      });
    }

    const account = await createPortalAccount(matchedUser, payload);

    return res.status(200).json({
      message: 'Account creato correttamente. Ora puoi accedere con il numero utenza e la password scelta.',
      accessIdentifier: account.accessIdentifier,
    });
  } catch (error) {
    return next(error);
  }
}

async function resendCode(_req, res) {
  return res.status(410).json({
    message: 'Il codice di conferma non e piu necessario. Registrati impostando direttamente la password.',
  });
}

module.exports = {
  requestRegistration,
  resendCode,
};
