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
  const numeroUtenza = String(payload.numeroUtenza || "").replace(/\s+/g, "");

  if (!/^400\d+000\d+(\/\d+)*$/.test(numeroUtenza)) {
    return "Il numero utenza deve avere il formato 400[condominio]000[utenza], esempio 40010001 oppure 40010001/2.";
  }

  // if (!payload.nome?.trim()) {
  //   return "Il nome è obbligatorio.";
  // }

  if (!payload.cognome?.trim()) {
    return "Il cognome è obbligatorio.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || "").trim())) {
    return "Inserisci un indirizzo email valido.";
  }

  return null;
}

module.exports = {
  normalizeRegistrationPayload,
  validateRegistrationPayload,
};
