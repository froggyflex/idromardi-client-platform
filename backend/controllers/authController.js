const {
  authenticatePortalUser,
  resetPasswordWithToken,
  updateTemporaryPassword,
  verifyPasswordResetIdentity,
} = require('../services/authService');
const {
  normalizeRegistrationPayload,
  validateIdentityPayload,
} = require('../utils/registrationValidation');

async function login(req, res, next) {
  try {
    const numeroUtenza = String(req.body.numeroUtenza || req.body.accessIdentifier || '').trim();
    const password = String(req.body.password || '');

    if (!numeroUtenza || !password) {
      return res.status(400).json({ message: 'Numero utenza e password sono obbligatori.' });
    }

    const session = await authenticatePortalUser(numeroUtenza, password);

    if (!session) {
      return res.status(401).json({ message: 'Credenziali non valide.' });
    }

    return res.json(session);
  } catch (error) {
    return next(error);
  }
}

async function changeTemporaryPassword(req, res, next) {
  try {
    const numeroUtenza = String(req.body.numeroUtenza || req.body.accessIdentifier || '').trim();
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!numeroUtenza || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Compila tutti i campi.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La nuova password deve avere almeno 8 caratteri.' });
    }

    const result = await updateTemporaryPassword(numeroUtenza, currentPassword, newPassword);

    if (!result) {
      return res.status(401).json({ message: 'Password temporanea non valida.' });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const resetToken = String(req.body.resetToken || '');
    const newPassword = String(req.body.password || req.body.newPassword || '');

    if (!resetToken) {
      const payload = normalizeRegistrationPayload(req.body);
      const validationError = validateIdentityPayload(payload);

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const result = await verifyPasswordResetIdentity(payload);

      if (!result.ok && result.reason === 'ACCOUNT_NOT_ACTIVE') {
        return res.status(404).json({
          message: 'Utenza verificata, ma non esiste ancora un account portale attivo. Usa Registrati per creare l account.',
        });
      }

      if (!result.ok) {
        return res.status(404).json({
          message: 'Non abbiamo trovato una corrispondenza con questi dati. Verifica numero utenza, cognome e codice fiscale.',
        });
      }

      return res.json({
        message: 'Identita verificata. Ora puoi impostare una nuova password.',
        resetToken: result.resetToken,
        accessIdentifier: result.accessIdentifier,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La nuova password deve avere almeno 8 caratteri.' });
    }

    const result = await resetPasswordWithToken(resetToken, newPassword);

    if (!result) {
      return res.status(401).json({ message: 'Verifica scaduta o non valida. Ripeti il controllo dei dati.' });
    }

    return res.json({
      ...result,
      message: 'Password aggiornata correttamente.',
    });
  } catch (error) {
    return next(error);
  }
}

function authVersion(_req, res) {
  return res.json({
    authFlow: 'numero-utenza-identity-reset',
    resetEndpoint: '/api/auth/forgot-password',
    requiresEmail: false,
    twoStepPasswordReset: true,
  });
}

module.exports = {
  authVersion,
  login,
  forgotPassword,
  changeTemporaryPassword,
};
