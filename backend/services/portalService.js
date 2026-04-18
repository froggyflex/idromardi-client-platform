const pool = require('../config/db');

const fallbackInvoices = [
  {
    id: 'FT-2026-004',
    period: 'Marzo 2026',
    issued: '2 Apr 2026',
    due: '24 Apr 2026',
    consumption: 18.6,
    amount: 42.8,
    status: 'In scadenza',
  },
  {
    id: 'FT-2026-003',
    period: 'Febbraio 2026',
    issued: '2 Mar 2026',
    due: '24 Mar 2026',
    consumption: 16.9,
    amount: 38.4,
    status: 'Pagata',
  },
];

const fallbackReadings = [
  { month: 'Ott', value: 13.8 },
  { month: 'Nov', value: 14.6 },
  { month: 'Dic', value: 17.4 },
  { month: 'Gen', value: 15.2 },
  { month: 'Feb', value: 16.9 },
  { month: 'Mar', value: 18.6 },
];

function buildPortalData(rows) {
  if (rows.length === 0) {
    return null;
  }

  const primary = rows[0];
  const fullName = `${primary.Nome} ${primary.Cognome}`.trim();
  const userIds = rows.map((row) => row.id_user).join('/');
  const interni = rows
    .map((row) => row.interno)
    .filter(Boolean)
    .join(', ');

  return {
    customer: {
      name: fullName,
      firstName: primary.Nome,
      lastName: primary.Cognome,
      email: primary.email,
      phone: primary.Mobile || '',
      mobile: primary.Mobile || '',
      fiscalCode: primary.C_F || '',
      accountNo: `IDR-${primary.id_Condominio}-${userIds}`,
      meterNo: interni ? `Interno ${interni}` : 'Interno non disponibile',
      address: primary.supply_address || 'Indirizzo fornitura non disponibile',
      tariff: 'Utenza domestica con ripartizione consumi',
      status: primary.status === 'ACTIVE' ? 'Attivo' : 'Disabilitato',
    },
    invoices: fallbackInvoices,
    readings: fallbackReadings,
    serviceNotes: [
      'Profilo collegato al portale clienti Idromardi',
      'Email verificata tramite codice temporaneo',
      'Puoi aggiornare i dati di contatto dalla sezione Profilo',
    ],
  };
}

async function getRowsByEmail(email) {
  const [rows] = await pool.execute(
    `
      SELECT
        apu.id,
        apu.id_Condominio,
        apu.id_user,
        apu.id_auto,
        apu.interno,
        apu.email,
        apu.status,
        u.Nome,
        u.Cognome,
        u.Mobile,
        u.C_F
      FROM activated_portal_users apu
      INNER JOIN utenze_v2 u
        ON u.id = apu.id_auto
      WHERE LOWER(TRIM(apu.email)) = LOWER(TRIM(?))
        AND apu.status = 'ACTIVE'
      ORDER BY apu.id_user ASC
    `,
    [email],
  );

  return rows;
}

async function getPortalDataByEmail(email) {
  const rows = await getRowsByEmail(email);
  return buildPortalData(rows);
}

async function updatePortalProfile(email, profile) {
  const [linkedUsers] = await pool.execute(
    `
      SELECT id_auto
      FROM activated_portal_users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
        AND status = 'ACTIVE'
    `,
    [email],
  );

  if (linkedUsers.length === 0) {
    return null;
  }

  const idAutoValues = linkedUsers.map((user) => user.id_auto);
  const placeholders = idAutoValues.map(() => '?').join(', ');

  await pool.execute(
    `
      UPDATE utenze_v2
      SET
        Mobile = ?,
        C_F = ?,
        updated_at = NOW()
      WHERE id IN (${placeholders})
    `,
    [profile.mobile || profile.phone, profile.fiscalCode, ...idAutoValues],
  );

  return getPortalDataByEmail(email);
}

module.exports = {
  getPortalDataByEmail,
  updatePortalProfile,
};
