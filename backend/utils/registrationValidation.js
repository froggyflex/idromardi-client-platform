function normalizeAccessIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/\s/g, '')
    .replace(/[^0-9/]/g, '');
}

function normalizeFiscalCode(value) {
  return String(value || '')
    .trim()
    .replace(/\s/g, '')
    .toUpperCase();
}

function normalizeRegistrationPayload(body) {
  return {
    numeroUtenza: normalizeAccessIdentifier(body.numeroUtenza),
    nome: String(body.nome || '').trim(),
    cognome: String(body.cognome || '').trim(),
    fiscalCode: normalizeFiscalCode(body.fiscalCode || body.codiceFiscale || body.cf),
    password: String(body.password || ''),
  };
}

function validateIdentityPayload(payload) {
  const numeroUtenza = String(payload.numeroUtenza || '').replace(/\s+/g, '');

  if (!/^400\d+000\d+(\/\d+)*$/.test(numeroUtenza)) {
    return 'Il numero utenza deve avere il formato 400[condominio]000[utenza], esempio 40010001 oppure 40010001/2.';
  }

  if (!payload.cognome?.trim()) {
    return 'Il cognome e obbligatorio.';
  }

  if (!/^[A-Z0-9]{11,16}$/.test(String(payload.fiscalCode || ''))) {
    return 'Inserisci un codice fiscale valido.';
  }

  return null;
}

function validateRegistrationPayload(payload) {
  const identityError = validateIdentityPayload(payload);

  if (identityError) return identityError;

  if (String(payload.password || '').length < 8) {
    return 'La password deve avere almeno 8 caratteri.';
  }

  return null;
}

module.exports = {
  normalizeAccessIdentifier,
  normalizeFiscalCode,
  normalizeRegistrationPayload,
  validateIdentityPayload,
  validateRegistrationPayload,
};
