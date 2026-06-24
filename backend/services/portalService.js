const pool = require("../config/db");
const ExcelJS = require("exceljs");
const OpenAI = require("openai");

const BASE_URL = process.env.BASE_URL || "";
const DOCUMENTS_BASE_URL =
  process.env.PUBLIC_DOCUMENTS_BASE_URL ||
  process.env.CLOUDFLARE_PUBLIC_BASE_URL ||
  "";
const DOCUMENTS_OBJECT_PREFIX =
  process.env.PUBLIC_DOCUMENTS_OBJECT_PREFIX ||
  process.env.CLOUDFLARE_DOCUMENTS_PREFIX ||
  "";

let openAiClient = null;

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error("Assistente non configurato."), {
      statusCode: 503,
    });
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openAiClient;
}

function buildAssistantContext(portalData) {
  return {
    customer: portalData.customer,
    latestInvoice: portalData.latestInvoice,
    invoices: portalData.invoices?.slice(0, 12) || [],
    billDocuments: portalData.billDocumentRows?.slice(0, 12) || [],
  };
}

async function askPortalAssistant(accountGroupId, message) {
  const portalData = await getPortalDataByAccountGroupId(accountGroupId);

  if (!portalData) {
    throw Object.assign(new Error("Profilo non trovato."), { statusCode: 404 });
  }

  const context = buildAssistantContext(portalData);
  const normalizedMessage = String(message || "").trim();

  const response = await getOpenAiClient().responses.create({
    model: "gpt-5.1",
    input: [
      {
        role: "system",
        content: `
Sei l'assistente ufficiale del portale clienti Idromardi.

Devi aiutare il cliente esclusivamente usando i dati forniti nel contesto.

Regole:
- Rispondi sempre in italiano.
- Non inventare mai importi, letture, date, stati o documenti.
- Se un dato non e presente, scrivi: "Dato non disponibile nel portale."
- Non mostrare JSON o dati grezzi.
- Mantieni le risposte brevi e leggibili.
- Non usare Markdown con asterischi.

Se parli di una bolletta, indica periodo, consumo, importo, stato e disponibilita del PDF.
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

function formatDate(value) {
  if (!value) return "Data non disponibile";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatBillingPeriod(month, year) {
  if (!month || !year) return "Periodo non disponibile";

  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
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

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function trimLeadingSlash(value) {
  return String(value || "").replace(/^\/+/, "");
}

function getPathFileName(value) {
  return trimLeadingSlash(value).split("/").filter(Boolean).pop() || "";
}

function buildDocumentObjectPath(filepath, filename) {
  const value = trimLeadingSlash(filepath);
  const prefix = trimLeadingSlash(DOCUMENTS_OBJECT_PREFIX).replace(/\/+$/, "");

  if (!prefix) {
    return value;
  }

  if (value === prefix || value.startsWith(`${prefix}/`)) {
    return value;
  }

  if (value.startsWith("storage/")) {
    return `${prefix}/${trimLeadingSlash(filename) || getPathFileName(value)}`;
  }

  return `${prefix}/${value}`;
}

function buildDocumentUrl(filepath, filename) {
  const value = String(filepath || "").trim();

  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (DOCUMENTS_BASE_URL) {
    return `${trimTrailingSlash(DOCUMENTS_BASE_URL)}/${buildDocumentObjectPath(value, filename)}`;
  }

  if (BASE_URL) {
    return `${trimTrailingSlash(BASE_URL)}/${trimLeadingSlash(value)}`;
  }

  return value.startsWith("/") ? value : `/${value}`;
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

function mapBillDocumentRow(row) {
  const fileUrl = buildDocumentUrl(row.filepath, row.filename);

  return {
    id: row.id,
    idUtenza: row.id_utenza,
    utenzaId: row.id_utenza,
    condominioId: row.condominio_id,
    period: row.trimestre_label || row.period_key || "Periodo non disponibile",
    periodKey: row.period_key || null,
    readingDate: formatDate(row.data_lettura),
    issued: row.data_lettura ? formatDate(row.data_lettura) : null,
    createdAt: row.created_at ? formatDate(row.created_at) : null,
    filename: row.filename || "Ripartizione PDF",
    fileName: row.filename || "Ripartizione PDF",
    filepath: row.filepath || null,
    fileUrl,
    status: fileUrl ? "available" : "missing",
    interno: row.interno || "N/D",
  };
}

function buildPortalData(rows, invoiceRows = [], billDocumentRows = []) {
  if (!rows.length) return null;

  const primary = rows[0];
  const invoices = invoiceRows.map(mapInvoiceRow);
  const latestInvoice = invoices[0] || null;

  return {
    customer: {
      name: `${primary.Nome || ""} ${primary.Cognome || ""}`.trim(),
      firstName: primary.Nome || "",
      lastName: primary.Cognome || "",
      email: primary.email || "",
      phone: primary.Mobile || "",
      mobile: primary.Mobile || "",
      fiscalCode: primary.C_F || "",
      accountNo: `IDR-${primary.id_Condominio}-${rows.map((row) => row.id_user).join("/")}`,
      meterNo: rows
        .map((row) => row.interno || row.Interno)
        .filter(Boolean)
        .join(", "),
      address: primary.condominio_indirizzo || "Indirizzo fornitura non disponibile",
      building: primary.condominio_nome || "",
      city: primary.condominio_citta || "",
      tariff: "Utenza domestica con ripartizione consumi",
      status: primary.status === "ACTIVE" ? "Attivo" : "Disabilitato",
    },

    latestInvoice,
    invoices,
    billDocumentRows: billDocumentRows.map(mapBillDocumentRow),

    readings: invoices
      .filter((invoice) => invoice.readingCurrent !== null && invoice.readingCurrent !== undefined)
      .map((invoice) => ({
        month: invoice.period,
        value: Number(invoice.readingCurrent || 0),
      }))
      .reverse(),

    serviceNotes: [
      "Profilo collegato al portale clienti Idromardi",
      "Identita verificata tramite dati utenza",
      "Puoi aggiornare i dati di contatto dalla sezione Profilo",
    ],
  };
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

async function getInvoiceRowsByUtenzeIds(utenzaIds) {
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

      ORDER BY rp.created_at DESC
    `,
    utenzaIds
  );

  return rows;
}

async function getPortalDataByAccountGroupId(accountGroupId) {
  const rows = await getRowsByAccountGroupId(accountGroupId);

  if (!rows.length) return null;

  const utenzaIds = rows.map((row) => row.utenza_id).filter(Boolean);
  const invoiceRows = await getInvoiceRowsByUtenzeIds(utenzaIds);
  const billDocumentRows = await getBillDocumentsByUtenzeIds(utenzaIds);

  return buildPortalData(rows, invoiceRows, billDocumentRows);
}

async function exportInvoicesByAccountGroupId(accountGroupId) {
  const rows = await getRowsByAccountGroupId(accountGroupId);

  if (!rows.length) {
    throw Object.assign(new Error("Profilo non trovato."), { statusCode: 404 });
  }

  const utenzaIds = rows.map((row) => row.utenza_id).filter(Boolean);
  const invoiceRows = await getInvoiceRowsByUtenzeIds(utenzaIds);
  const visibleInvoices = invoiceRows
    .map(mapInvoiceRow)
    .filter(
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
    { header: "Consumo mc", key: "consumption", width: 15 },
    { header: "Lettura precedente", key: "readingPrevious", width: 20 },
    { header: "Lettura attuale", key: "readingCurrent", width: 20 },
    { header: "Importo EUR", key: "amount", width: 15 },
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

  sheet.getColumn("amount").numFmt = "#,##0.00";
  sheet.getColumn("consumption").numFmt = "#,##0.00";

  return workbook.xlsx.writeBuffer();
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
  exportInvoicesByAccountGroupId,
  askPortalAssistant,
};
