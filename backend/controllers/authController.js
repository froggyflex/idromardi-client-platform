const {
  authenticatePortalUser,
  updateTemporaryPassword,
} = require('../services/authService');

async function login(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password sono obbligatorie.' });
    }

    const session = await authenticatePortalUser(email, password);

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
    const email = String(req.body.email || '').trim().toLowerCase();
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Compila tutti i campi.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La nuova password deve avere almeno 8 caratteri.' });
    }

    const result = await updateTemporaryPassword(email, currentPassword, newPassword);

    if (!result) {
      return res.status(401).json({ message: 'Password temporanea non valida.' });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  changeTemporaryPassword,
};
