function normalizeRegistrationPayload(body) {
  return {
    numeroUtenza: String(body.numeroUtenza || '')
      .trim()
      .replace(/\s/g, '')
      .replace(/[^0-9/]/g, ''),
    nome: String(body.nome || '').trim(),
    cognome: String(body.cognome || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
  };
}

function validateRegistrationPayload(payload) {
  if (!/^\d{8}(\/\d+)?$/.test(payload.numeroUtenza)) {
    return 'Il numero utenza deve avere il formato 40010001 oppure 40010001/2.';
  }

  if (!payload.nome) {
    return 'Il nome e obbligatorio.';
  }

  if (!payload.cognome) {
    return 'Il cognome e obbligatorio.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'Inserisci un indirizzo email valido.';
  }

  return null;
}

module.exports = {
  normalizeRegistrationPayload,
  validateRegistrationPayload,
};
