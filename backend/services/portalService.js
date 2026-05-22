const pool = require('../config/db');
const ExcelJS = require("exceljs");
const OpenAI = require("openai");


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildAssistantContext(portalData) {
  return {
    customer: portalData.customer,
    latestInvoice: portalData.latestInvoice,
    invoices: portalData.invoices?.slice(0, 12) || [],
    billDocuments: portalData.billDocuments?.slice(0, 12) || [],
    stats: portalData.stats || null,
  };
}

async function askPortalAssistant(accountGroupId, message) {async function askPortalAssistant(accountGroupId, message) {
  const portalData = await getPortalDataByAccountGroupId(accountGroupId);

  if (!portalData) {
    throw Object.assign(new Error("Profilo non trovato."), {
      statusCode: 404,
    });
  }

  const context = buildAssistantContext(portalData);
  const normalizedMessage = String(message || "").trim();

  const response = await client.responses.create({
    model: "gpt-5.1",
    input: [
      {
        role: "system",
        content: `
Sei l'assistente ufficiale del portale clienti Idromardi.

Devi aiutare il cliente esclusivamente usando i dati forniti nel contesto.

REGOLE:
- Rispondi sempre in italiano.
- Non inventare mai importi, letture, date, stati o documenti.
- Se un dato non è presente, scrivi: "Dato non disponibile nel portale."
- Non mostrare JSON.
- Non mostrare dati grezzi.
- Non usare Markdown con **asterischi**.
- Non scrivere muri di testo.
- Non ripetere tutto il profilo cliente se non richiesto.
- Mantieni le risposte brevi e leggibili.

FORMATTAZIONE:
- Usa righe corte.
- Usa elenchi puntati con "•".
- Separa le sezioni con una riga vuota.
- Usa massimo 4 punti elenco per sezione.
- Se parli di una bolletta, usa sempre questo formato:

Periodo:
• mese anno

Dettagli:
• Consumo: valore mc
• Importo: valore €
• Stato: stato
• PDF: disponibile / non disponibile

SE IL CLIENTE SALUTA SOLTANTO:
Rispondi così:

Ciao [nome].

Posso aiutarti con:

• Ultima bolletta disponibile
• Consumi e letture
• Download PDF delle ripartizioni
• Dati del profilo utenza

Dimmi pure cosa vuoi controllare.
        `.trim(),
      },
      {
        role: "user",
        content: `
CONTESTO CLIENTE:
${JSON.stringify(context, null, 2)}

MESSAGGIO CLIENTE:
${normalizedMessage}

Rispondi solo alla domanda del cliente usando esclusivamente il contesto disponibile.
        `.trim(),
      },
    ],
  });

  return response.output_text || "Non sono riuscito a generare una risposta.";
}
  const portalData = await getPortalDataByAccountGroupId(accountGroupId);

  if (!portalData) {
    throw Object.assign(
      new Error("Profilo non trovato."),
      { statusCode: 404 }
    );
  }

  const context = buildAssistantContext(portalData);

  const normalizedMessage = String(message || "").trim();

  const response = await client.responses.create({
    model: "gpt-5.1",

    input: [
      {
        role: "system",
        content: `
Sei l'assistente ufficiale del portale clienti Idromardi.

Devi aiutare il cliente esclusivamente usando i dati forniti nel contesto.

REGOLE OBBLIGATORIE:
- Non inventare mai importi, letture, date, stati o documenti.
- Se un dato non è presente, scrivi:
  "Dato non disponibile nel portale."
- Non parlare di dati non presenti nel contesto.
- Non dare consulenza legale, fiscale o tecnica.
- Non spiegare il funzionamento interno del sistema.
- Non mostrare JSON.
- Non mostrare dati grezzi.
- Non ripetere tutto il profilo cliente se non richiesto.
- Mantieni sempre le risposte concise.
- Rispondi sempre in italiano.
- Non usare Markdown.
- Non usare asterischi (**).
- Non usare titoli enormi.
- Non scrivere paragrafi lunghi.

FORMATO RISPOSTA:
1. Breve saluto naturale
2. Risposta diretta
3. Eventuali dati utili in elenco puntato
4. Breve chiusura

Se il messaggio del cliente è solo un saluto:
- rispondi brevemente
- spiega in massimo 4 punti cosa puoi fare

ESEMPI DI STILE:

"Ciao Panos.

Posso aiutarti con:
- ultime bollette
- consumi e letture
- download PDF disponibili
- informazioni sul profilo

Dimmi pure cosa vuoi controllare."

OPPURE:

"La tua ultima bolletta disponibile è relativa a maggio 2026.

- Consumo: 31 mc
- Importo: 51,80 €
- Stato: Calcolata

Puoi anche scaricare il PDF dalla sezione ripartizioni."
        `.trim(),
      },

      {
        role: "user",
        content: `
CONTESTO CLIENTE:
${JSON.stringify(context, null, 2)}

MESSAGGIO CLIENTE:
${normalizedMessage}

Rispondi solo alla domanda del cliente usando esclusivamente il contesto disponibile.
        `.trim(),
      },
    ],
  });

  return (
    response.output_text ||
    "Non sono riuscito a generare una risposta."
  );
}

module.exports = {
  askPortalAssistant,
};

//esporta tutte le fatture associate a un account group ID in un file Excel
async function exportInvoicesByAccountGroupId(accountGroupId) {
  const rows = await getRowsByAccountGroupId(accountGroupId);

  if (!rows.length) {
    throw Object.assign(new Error("Profilo non trovato."), { statusCode: 404 });
  }

  const utenzaIds = rows.map((row) => row.utenza_id).filter(Boolean);
  const invoiceRows = await getInvoicesByUtenzeIdsMe(utenzaIds);
  const portalData = buildPortalData(rows, invoiceRows);

  const visibleInvoices = portalData.invoices.filter(
    (invoice) =>
      Number(invoice.amount || 0) > 0 ||
      Number(invoice.consumption || 0) > 0
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Idromardi";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Fatture");

  sheet.columns = [
    { header: "ID", key: "id", width: 38 },
    { header: "Periodo", key: "period", width: 22 },
    { header: "Data emissione", key: "issued", width: 20 },
    { header: "Scadenza", key: "due", width: 20 },
    { header: "Consumo m³", key: "consumption", width: 15 },
    { header: "Lettura precedente", key: "readingPrevious", width: 20 },
    { header: "Lettura attuale", key: "readingCurrent", width: 20 },
    { header: "Importo €", key: "amount", width: 15 },
    { header: "Stato", key: "status", width: 18 },
  ];

  for (const invoice of visibleInvoices) {
    sheet.addRow({
      id: invoice.id,
      period: invoice.period,
      issued: invoice.issued,
      due: invoice.due || "Non disponibile",
      consumption: Number(invoice.consumption || 0),
      readingPrevious: invoice.readingPrevious ?? "",
      readingCurrent: invoice.readingCurrent ?? "",
      amount: Number(invoice.amount || 0),
      status: invoice.status,
    });
  }

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).height = 22;

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle" };
    });
  });

  sheet.getColumn("amount").numFmt = '#,##0.00 €';
  sheet.getColumn("consumption").numFmt = '#,##0.00';

  return workbook.xlsx.writeBuffer();
}


function formatDate(value) {
  if (!value) return "Data non disponibile";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonth(value) {
  if (!value) return "N/D";

  return new Intl.DateTimeFormat("it-IT", {
    month: "short",
  }).format(new Date(value));
}

function mapInvoiceStatus(status) {
  switch (String(status || "").toUpperCase()) {
    case "PAGATA":
    case "PAGATO":
      return "Pagata";

    case "EMESSA":
    case "PARZIALMENTE_PAGATA":
      return "In scadenza";

    case "ANNULLATA":
    case "ANNULLATO":
      return "Annullata";

    default:
      return status || "Non disponibile";
  }
}

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

function formatBillingPeriod(month, year) {
  if (!month || !year) return "Periodo non disponibile";

  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);
}
function formatBillingMonthShort(month, year) {
  if (!month || !year) return "N/D";

  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("it-IT", {
    month: "short",
  }).format(date);
}
function mapSessionStatus(status) {
  const value = String(status || "").trim().toUpperCase();

  switch (value) {
    case "BOZZA":
      return "Bozza";

    case "CALCOLATA":
      return "Calcolata";

    case "EMESSA":
      return "Emessa";

    case "PAGATA":
      return "Pagata";

    case "ANNULLATA":
    case "ANNULLATO":
      return "Annullata";

    default:
      return status || "Non disponibile";
  }
}

const BASE_URL = process.env.BASE_URL;

function buildPortalData(rows, invoiceRows = [], billDocumentRows = []) {

   
  if (rows.length === 0) return null;

  const primary = rows[0];

  const fullName = `${primary.Nome || ""} ${primary.Cognome || ""}`.trim();

  const userIds = rows
    .map((row) => row.id_user)
    .filter(Boolean)
    .join("/");

  const interni = rows
    .map((row) => row.interno || row.Interno)
    .filter(Boolean)
    .join(", ");

    const invoices = invoiceRows.map((row) => ({
      id: row.id,

      idUtenza: row.id_utenza,
      condominioId: row.condominio_id,

      period: row.trimestre_label || row.period_key || "-",
      periodKey: row.period_key,

      issued: row.data_lettura ? formatDate(row.data_lettura) : null,
      createdAt: row.created_at ? formatDate(row.created_at) : null,

      due: null,

      filename: row.filename,
      fileUrl: row.filepath ? `${BASE_URL}${row.filepath}` : null,

      amount: null,
      consumption: null,

      status: "available",

      readingPrevious: null,
      readingCurrent: null,

      user: {
        idUser: row.id_user,
        name: [row.Nome, row.Cognome].filter(Boolean).join(" "),
        isolato: row.Isolato,
        scala: row.Scala,
        interno: row.Interno,
      },
    }));

   
  const readings = invoiceRows
    .filter((row) => row.lettura_attuale !== null && row.lettura_attuale !== undefined)
    .map((row) => ({
      month: formatBillingMonthShort(row.period_month, row.period_year),
      value: Number(row.lettura_attuale || 0),
    }))
    .reverse();

  return {
    customer: {
      name: fullName,
      firstName: primary.Nome || "",
      lastName: primary.Cognome || "",
      email: primary.email,
      phone: primary.Mobile || "",
      mobile: primary.Mobile || "",
      fiscalCode: primary.C_F || "",
      accountNo: `IDR-${primary.id_Condominio}-${userIds}`,
      meterNo: primary.Matricola_Contatore || "Contatore non disponibile",
      address: primary.condominio_indirizzo || "Indirizzo fornitura non disponibile",
      building: primary.condominio_nome || "",
      city: primary.condominio_citta || "",
      internal: interni || "Interno non disponibile",
      tariff: "Utenza domestica con ripartizione consumi",
      status: primary.status === "ACTIVE" ? "Attivo" : "Disabilitato",
    },

    invoices,
    readings,

    serviceNotes: [
      "Profilo collegato al portale clienti Idromardi",
      "Email verificata tramite codice temporaneo",
      "Puoi aggiornare i dati di contatto dalla sezione Profilo",
    ],
  };
}

async function getRowsByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

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

        u.id AS utenza_id,
        u.Nome,
        u.Cognome,
        u.Mobile,
        u.C_F,
        u.Interno,
        u.Isolato,
        u.Scala,
        u.Palazzina,
        u.Matricola_Contatore,
        u.stato AS utenza_stato,

        c.id AS condominio_id,
        c.nome AS condominio_nome,
        c.indirizzo AS condominio_indirizzo,
        c.citta AS condominio_citta

      FROM activated_portal_users apu

      INNER JOIN utenze_v2 u
        ON u.id COLLATE utf8mb4_unicode_ci
         = apu.id_auto COLLATE utf8mb4_unicode_ci

      LEFT JOIN condomini_v2 c
        ON c.id COLLATE utf8mb4_unicode_ci
         = u.condominio_id COLLATE utf8mb4_unicode_ci

      WHERE apu.email COLLATE utf8mb4_unicode_ci
          = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
        AND apu.status COLLATE utf8mb4_unicode_ci
          = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci

      ORDER BY apu.id_user ASC
    `,
    [normalizedEmail, "ACTIVE"]
  );

  return rows;
}

async function getInvoicesByUtenzeIdsMe(utenzaIds) {
  if (!utenzaIds.length) return [];

  const placeholders = utenzaIds.map(() => "?").join(", ");

  const [rows] = await pool.execute(
    `
      SELECT
        fs.id AS sessione_fattura_id,
        fs.stato AS stato_fattura,
        fs.data_fattura,

        ls.period_month,
        ls.period_year,

        SUM(COALESCE(fr.consumo_totale, 0)) AS consumo_totale,
        SUM(COALESCE(fr.consumo_normale, 0)) AS consumo_normale,
        SUM(COALESCE(fr.consumo_acconto, 0)) AS consumo_acconto,
        SUM(COALESCE(fr.totale, 0)) AS totale,

        MIN(fr.lettura_precedente) AS lettura_precedente,
        MAX(fr.lettura_attuale) AS lettura_attuale,

        COUNT(*) AS righe_count,
        GROUP_CONCAT(fr.id_utenza ORDER BY fr.id_utenza SEPARATOR ',') AS utenze_ids

      FROM fatture_righe fr

      INNER JOIN fatture_sessioni fs
        ON fs.id COLLATE utf8mb4_unicode_ci
         = fr.id_fattura COLLATE utf8mb4_unicode_ci

      LEFT JOIN letture_sessioni ls
        ON ls.id COLLATE utf8mb4_unicode_ci
         = fs.id_periodo_attuale COLLATE utf8mb4_unicode_ci

      WHERE fr.id_utenza IN (${placeholders})

      GROUP BY
        fs.id,
        fs.stato,
        fs.data_fattura,
        ls.period_month,
        ls.period_year

      ORDER BY
        ls.period_year DESC,
        ls.period_month DESC,
        fs.created_at DESC
    `,
    utenzaIds
  );

  return rows;
}

async function getInvoicesByUtenzeIds(utenzaIds) {
    if (!Array.isArray(utenzaIds) || utenzaIds.length === 0) return [];

  const placeholders = utenzaIds.map(() => "?").join(", ");

 
  const [rows] = await pool.execute(
    `
    SELECT
      rp.id,
      rp.id_utenza,
      rp.condominio_id,
      rp.period_key,
      rp.filename,
      rp.filepath,
      rp.trimestre_label,
      rp.data_lettura,
      rp.created_at,

      u.id_user,
      u.Nome,
      u.Cognome,
      u.Isolato,
      u.Scala,
      u.Interno

    FROM ripartizione_pdfs rp

    LEFT JOIN utenze_v2 u
      ON u.id = rp.id_utenza

    WHERE rp.id_utenza IN (${placeholders})

    ORDER BY rp.created_at DESC, rp.id DESC
    `,
    utenzaIds
  );
  
  console.log("Fetched invoices for utenza IDs", utenzaIds, { rowsCount: rows.length });
  return rows;
}

async function getRowsByAccountGroupId(accountGroupId) {
  const [rows] = await pool.execute(
    `
      SELECT
        apu.id,
        apu.account_group_id,
        apu.id_Condominio,
        apu.id_user,
        apu.id_auto,
        apu.interno,
        apu.email,
        apu.status,

        u.id AS utenza_id,
        u.Nome,
        u.Cognome,
        u.Mobile,
        u.C_F,
        u.Interno,
        u.Isolato,
        u.Scala,
        u.Palazzina,
        u.Matricola_Contatore,
        u.stato AS utenza_stato,

        c.id AS condominio_id,
        c.nome AS condominio_nome,
        c.indirizzo AS condominio_indirizzo,
        c.citta AS condominio_citta

      FROM activated_portal_users apu

      INNER JOIN utenze_v2 u
        ON u.id COLLATE utf8mb4_unicode_ci
         = apu.id_auto COLLATE utf8mb4_unicode_ci

      LEFT JOIN condomini_v2 c
        ON c.id COLLATE utf8mb4_unicode_ci
         = u.condominio_id COLLATE utf8mb4_unicode_ci

      WHERE apu.account_group_id = ?
        AND apu.status = 'ACTIVE'

      ORDER BY apu.id_user ASC
    `,
    [accountGroupId]
  );

  return rows;
}

async function getBillDocumentsByUtenzeIds(utenzaIds) {
  if (!utenzaIds.length) return [];

  const placeholders = utenzaIds.map(() => "?").join(", ");

  const [rows] = await pool.execute(
    `
      SELECT
        rp.id,
        rp.id_utenza,
        rp.condominio_id,
        rp.period_key,
        rp.filename,
        rp.filepath,
        rp.trimestre_label,
        rp.data_lettura,
        rp.created_at,

        u.Interno AS interno,
        u.Nome AS nome,
        u.Cognome AS cognome

      FROM ripartizione_pdfs rp

      LEFT JOIN utenze_v2 u
        ON u.id COLLATE utf8mb4_unicode_ci
         = rp.id_utenza COLLATE utf8mb4_unicode_ci

      WHERE rp.id_utenza IN (${placeholders})

      ORDER BY
        rp.created_at DESC
    `,
    utenzaIds
  );

  return rows;
}

async function getLatestInvoicesByUtenzeIds(utenzaIds) {
  if (!utenzaIds.length) return [];

  const placeholders = utenzaIds.map(() => "?").join(", ");

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM (
        SELECT
          fs.id AS sessione_fattura_id,
          fs.stato AS stato_fattura,
          fs.data_fattura,

          ls.period_month,
          ls.period_year,

          SUM(COALESCE(fr.consumo_totale, 0)) AS consumo_totale,
          SUM(COALESCE(fr.consumo_normale, 0)) AS consumo_normale,
          SUM(COALESCE(fr.totale, 0)) AS totale,

          MIN(fr.lettura_precedente) AS lettura_precedente,
          MAX(fr.lettura_attuale) AS lettura_attuale,

          ROW_NUMBER() OVER (
            ORDER BY
              ls.period_year DESC,
              ls.period_month DESC,
              fs.created_at DESC
          ) AS rn

        FROM fatture_righe fr

        INNER JOIN fatture_sessioni fs
          ON fs.id = fr.id_fattura

        LEFT JOIN letture_sessioni ls
          ON ls.id = fs.id_periodo_attuale

        WHERE fr.id_utenza IN (${placeholders})

        GROUP BY
          fs.id,
          fs.stato,
          fs.data_fattura,
          ls.period_month,
          ls.period_year
      ) ranked

      WHERE rn = 1
    `,
    utenzaIds
  );

  return rows;
}

async function getPortalDataByAccountGroupId(accountGroupId) {
  const rows = await getRowsByAccountGroupId(accountGroupId);

  if (!rows.length) return null;

  const utenzaIds = rows.map((row) => row.utenza_id).filter(Boolean);

  const latestInvoiceRows = await getLatestInvoicesByUtenzeIds(utenzaIds);
  const allInvoiceRows = await getInvoicesByUtenzeIds(utenzaIds);
  const billDocumentRows = await getBillDocumentsByUtenzeIds(utenzaIds);

  return buildPortalData(rows, {
    latestInvoiceRows,
    allInvoiceRows,
     
  }, billDocumentRows);
}
 

async function getPortalDataByPortalUserId(portalUserId) {
  const rows = await getRowsByPortalUserId(portalUserId);

  if (!rows.length) return null;

  const utenzaIds = rows.map((row) => row.utenza_id).filter(Boolean);
  const invoiceRows = await getInvoicesByUtenzeIdsMe(utenzaIds);

  console.log("Fetched portal data for user ID", portalUserId, { rowsCount: rows.length, invoiceRowsCount: invoiceRows.length });

  return buildPortalDataMe(rows, invoiceRows);
}


function buildPortalData(rows, { latestInvoiceRows = [], allInvoiceRows = [] },  billDocumentRows = []) {
  if (!rows.length) return null;

  const primary = rows[0];

  const invoices = allInvoiceRows.map(mapInvoiceRow);
  const latestInvoices = latestInvoiceRows.map(mapInvoiceRow);

  const latestInvoice = latestInvoices[0] || invoices[0] || null;

   
  const billDocuments = billDocumentRows.map((row) => ({
    id: row.id,
    utenzaId: row.id_utenza,
    period: row.trimestre_label || row.period_key || "Periodo non disponibile",
    readingDate: formatDate(row.data_lettura),
    createdAt: formatDate(row.created_at),
    fileName: row.filename || "Ripartizione PDF",
    fileUrl: row.filepath ? `${BASE_URL}${row.filepath}` : null,
    status: row.filepath ? "Disponibile" : "Non disponibile",
    interno: row.interno || "N/D",

  }));

  return {
    customer: {
      name: `${primary.Nome || ""} ${primary.Cognome || ""}`.trim(),
      firstName: primary.Nome || "",
      lastName: primary.Cognome || "",
      email: primary.email,
      phone: primary.Mobile || "",
      mobile: primary.Mobile || "",
      fiscalCode: primary.C_F || "",
      accountNo: `IDR-${primary.id_Condominio}-${rows.map((r) => r.id_user).join("/")}`,
      meterNo: rows.map((r) => r.interno || r.Interno).filter(Boolean).join(", "),
      address: primary.condominio_indirizzo || "Indirizzo fornitura non disponibile",
      building: primary.condominio_nome || "",
      city: primary.condominio_citta || "",
      tariff: "Utenza domestica con ripartizione consumi",
      status: primary.status === "ACTIVE" ? "Attivo" : "Disabilitato",
    },

    latestInvoice,
    invoices,
    billDocumentRows: billDocuments,

    readings: invoices
      .filter((invoice) => invoice.readingCurrent !== null && invoice.readingCurrent !== undefined)
      .map((invoice) => ({
        month: invoice.period,
        value: Number(invoice.readingCurrent || 0),
      }))
      .reverse(),

    serviceNotes: [
      "Profilo collegato al portale clienti Idromardi",
      "Email verificata tramite codice temporaneo",
      "Puoi aggiornare i dati di contatto dalla sezione Profilo",
    ],
  };
}

 

function mapInvoiceRow(row) {
  return {
    id: row.sessione_fattura_id,
    period: formatBillingPeriod(row.period_month, row.period_year),
    issued: formatDate(row.data_fattura),
    due: null,
    consumption: Number(row.consumo_totale || row.consumo_normale || 0),
    amount: Number(row.totale || 0),
    status: mapSessionStatus(row.stato_fattura),
    readingPrevious: row.lettura_precedente,
    readingCurrent: row.lettura_attuale,
    rowsCount: Number(row.righe_count || 0),
    utenzeIds: String(row.utenze_ids || "")
      .split(",")
      .filter(Boolean)
      .map(Number),
    fileUrl: row.file_url || null,
  };
}
async function updatePortalProfile(accountGroupId, profile) {
  const [linkedUsers] = await pool.execute(
    `
      SELECT id_auto
      FROM activated_portal_users
      WHERE account_group_id = ?
        AND status = 'ACTIVE'
    `,
    [accountGroupId]
  );

  if (!linkedUsers.length) return null;

  const idAutoValues = linkedUsers.map((user) => user.id_auto);
  const placeholders = idAutoValues.map(() => "?").join(", ");

  await pool.execute(
    `
      UPDATE utenze_v2
      SET
        Mobile = ?,
        C_F = ?,
        updated_at = NOW()
      WHERE id IN (${placeholders})
    `,
    [profile.mobile || profile.phone || "", profile.fiscalCode || "", ...idAutoValues]
  );

  return getPortalDataByAccountGroupId(accountGroupId);
}
module.exports = {
  getRowsByAccountGroupId,
  updatePortalProfile,
  getPortalDataByAccountGroupId,
  getPortalDataByPortalUserId,
  exportInvoicesByAccountGroupId,
  askPortalAssistant,
};
