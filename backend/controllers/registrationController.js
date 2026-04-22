const { findMatchingUser, sendConfirmationCode, resendConfirmationCode } = require('../services/registrationService');
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
          'Non abbiamo trovato una corrispondenza con i dati inseriti. Verifica numero utenza, nome e cognome.',
      });
    }

    const confirmation = await sendConfirmationCode(matchedUser, payload.email);

    return res.status(200).json({
      message:
        'Utenza trovata. Ti abbiamo inviato un codice via email per confermare la registrazione.',
      requestId: confirmation.requestId,
      expiresAt: confirmation.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
}

async function resendCode(req, res, next) {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: 'requestId è obbligatorio.' });
    }

    const result = await resendConfirmationCode(requestId);

    return res.status(200).json({
      message: 'Nuovo codice inviato alla tua email.',
      requestId: result.requestId,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requestRegistration,
  resendCode,
};
