import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import {
  initMetaApi,
  createTestCampaign,
  createTestAdSet,
  uploadAdImage,
  createAdCreative,
  createAd,
  listCampaigns,
} from "./metaClient.js";

// Ad account "Gonzalo Prueba" — fija a proposito, para no crear nada en cuentas reales.
const TEST_AD_ACCOUNT_ID = "act_1652894765898995";
// Pagina de Facebook usada para el creative (Vamos Bien Marketing Digital).
const PAGE_ID = "972815165908525";
const PORT = 3000;

const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");

const OBJECTIVES: Array<{ value: string; label: string }> = [
  { value: "OUTCOME_TRAFFIC", label: "Tráfico — visitas a un sitio o landing" },
  { value: "OUTCOME_ENGAGEMENT", label: "Interacción — likes, comentarios, mensajes" },
  { value: "OUTCOME_LEADS", label: "Clientes potenciales — formularios de contacto" },
  { value: "OUTCOME_SALES", label: "Ventas — conversiones/compras" },
  { value: "OUTCOME_AWARENESS", label: "Reconocimiento — maximo alcance" },
];

initMetaApi();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use("/assets", express.static(ASSETS_DIR));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Paleta tomada del isologo de Vamos Bien Marketing Digital.
const BRAND = {
  blue: "#2E86DE",
  green: "#8CC63F",
  red: "#E63946",
  orange: "#F7941D",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vamos Bien — Agente Meta Ads</title>
  <link rel="icon" href="/assets/logo.jpg" />
  <style>
    :root {
      --blue: ${BRAND.blue};
      --green: ${BRAND.green};
      --red: ${BRAND.red};
      --orange: ${BRAND.orange};
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
      max-width: 640px;
      margin: 0 auto;
      padding: 0 20px 48px;
      color: #1c1e21;
      line-height: 1.4;
      background:
        radial-gradient(560px circle at 8% -8%, rgba(46,134,222,0.10), transparent 60%),
        radial-gradient(480px circle at 100% 0%, rgba(247,148,29,0.10), transparent 55%),
        radial-gradient(420px circle at 50% 100%, rgba(140,198,63,0.06), transparent 60%),
        #f7f7f8;
      background-attachment: fixed;
      min-height: 100vh;
    }
    .topbar {
      height: 6px;
      margin: 0 -20px 28px;
      background: linear-gradient(90deg, var(--blue), var(--green), var(--red), var(--orange));
    }
    header { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
    header img { height: 44px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    h1 { font-size: 1.2rem; margin: 0; color: #101113; letter-spacing: -0.015em; }
    .subtitle { color: #80838a; font-size: 0.82rem; margin: 3px 0 0; }
    .card {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 8px 30px rgba(20,20,30,0.06), 0 1px 2px rgba(20,20,30,0.04);
      margin-bottom: 20px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #9a9da3;
      margin: 0 0 16px;
    }
    .section-title::before {
      content: "";
      width: 4px;
      height: 14px;
      border-radius: 2px;
      background: linear-gradient(180deg, var(--blue), var(--orange));
    }
    .divider { border: none; border-top: 1px dashed #e5e5e8; margin: 24px 0; }
    label { display: block; margin-top: 14px; font-weight: 600; font-size: 0.88rem; color: #333; }
    label:first-of-type { margin-top: 0; }
    label .opt { font-weight: 400; color: #b0b2b8; }
    input, select, textarea {
      width: 100%;
      padding: 11px 13px;
      margin-top: 6px;
      box-sizing: border-box;
      font-size: 0.95rem;
      border: 1.5px solid #e6e6e9;
      border-radius: 10px;
      font-family: inherit;
      background: #fff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    textarea { resize: vertical; min-height: 66px; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 4px rgba(46,134,222,0.12); }
    .hint { color: #a3a5ab; font-size: 0.78rem; margin-top: 6px; }

    .dropzone {
      margin-top: 6px;
      border: 1.5px dashed #d6d8dc;
      border-radius: 14px;
      padding: 22px;
      text-align: center;
      cursor: pointer;
      background: linear-gradient(180deg, #fbfbfc, #f5f6f8);
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .dropzone:hover { border-color: var(--blue); }
    .dropzone.dragover { border-color: var(--blue); background: rgba(46,134,222,0.06); }
    .dropzone svg { color: #b5b7bd; margin-bottom: 6px; }
    .dropzone p { margin: 0; font-size: 0.88rem; color: #666; }
    .dropzone p.hint { margin-top: 3px; }
    .dropzone-preview { display: none; position: relative; }
    .dropzone-preview img { max-width: 100%; max-height: 200px; border-radius: 10px; display: block; margin: 0 auto; }
    .dropzone-preview .filename { margin-top: 10px; font-size: 0.82rem; color: #666; }
    .dropzone-preview .change-link { color: var(--blue); font-weight: 600; cursor: pointer; }

    button {
      margin-top: 26px;
      width: 100%;
      padding: 14px 24px;
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(90deg, var(--red), var(--orange));
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(230,57,70,0.22);
      transition: filter 0.15s ease, transform 0.05s ease, box-shadow 0.15s ease;
    }
    button:hover { filter: brightness(0.97); box-shadow: 0 8px 22px rgba(230,57,70,0.28); }
    button:active { transform: scale(0.99); }
    button:disabled { opacity: 0.7; cursor: wait; box-shadow: none; }
    .ok { background: #eef8ea; border: 1px solid var(--green); color: #3c6e1f; padding: 14px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.88rem; }
    .ok strong { display: block; margin-bottom: 6px; }
    .ok ul { margin: 0; padding-left: 18px; }
    .ok li { margin: 3px 0; }
    .ok code { background: rgba(0,0,0,0.06); padding: 1px 5px; border-radius: 4px; font-size: 0.82em; }
    .err { background: #fdecec; border: 1px solid var(--red); color: #8a1f26; padding: 14px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.88rem; }
    h2 { font-size: 0.95rem; color: #333; margin: 0 0 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #a3a3a3; border-bottom: 1px solid #eee; }
    td { text-align: left; padding: 9px 8px; border-bottom: 1px solid #f4f4f4; font-size: 0.85rem; }
    tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
    .badge-active { background: #eef8ea; color: #3c6e1f; }
    .badge-paused { background: #f0f0f0; color: #777; }
    .muted { color: #aaa; font-size: 0.78rem; }
  </style>
</head>
<body>
  <div class="topbar"></div>
  <header>
    <img src="/assets/logo.jpg" alt="Vamos Bien Marketing Digital" />
    <div>
      <h1>Agente Meta Ads · Crear campaña de prueba</h1>
      <p class="subtitle">Cuenta ${TEST_AD_ACCOUNT_ID} · todo queda en PAUSED · segmentación abierta (solo país, sin intereses ni retargeting por ahora)</p>
    </div>
  </header>
  ${body}
  <script>
    const fileInput = document.getElementById('image');
    const dropzone = document.getElementById('dropzone');
    const empty = document.getElementById('dropzoneEmpty');
    const preview = document.getElementById('dropzonePreview');
    const previewImg = document.getElementById('previewImg');
    const filename = document.getElementById('filename');

    function showFile(file) {
      if (!file) { empty.style.display = 'block'; preview.style.display = 'none'; return; }
      previewImg.src = URL.createObjectURL(file);
      filename.textContent = file.name;
      empty.style.display = 'none';
      preview.style.display = 'block';
    }

    if (dropzone) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => showFile(fileInput.files && fileInput.files[0]));
      ['dragover', 'dragleave', 'drop'].forEach((evt) => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.classList.toggle('dragover', evt === 'dragover');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length) {
          fileInput.files = e.dataTransfer.files;
          showFile(fileInput.files[0]);
        }
      });
    }

    const formEl = document.querySelector('form');
    if (formEl) {
      formEl.addEventListener('submit', () => {
        const btn = formEl.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Creando... (puede tardar unos segundos)';
      });
    }
  </script>
</body>
</html>`;
}

interface FormValues {
  name?: string;
  objective?: string;
  budget?: string;
  headline?: string;
  message?: string;
}

function form(values: FormValues = {}): string {
  const v = {
    name: values.name ?? "",
    objective: values.objective ?? OBJECTIVES[0].value,
    budget: values.budget ?? "10000",
    headline: values.headline ?? "",
    message: values.message ?? "",
  };

  return `
  <div class="card">
    <form method="POST" action="/crear" enctype="multipart/form-data">
      <p class="section-title">Campaña</p>

      <label for="name">Nombre <span class="opt">(opcional, se genera uno si lo dejás vacío)</span></label>
      <input type="text" id="name" name="name" placeholder="Test UI - ..." value="${escapeHtml(v.name)}" />

      <label for="objective">Objetivo</label>
      <select id="objective" name="objective">
        ${OBJECTIVES.map((o) => `<option value="${o.value}"${o.value === v.objective ? " selected" : ""}>${o.label}</option>`).join("")}
      </select>

      <label for="budget">Presupuesto diario (ARS)</label>
      <input type="number" id="budget" name="budget" value="${escapeHtml(v.budget)}" min="1" required />

      <hr class="divider" />
      <p class="section-title">Anuncio <span class="opt">(opcional)</span></p>

      <label for="headline">Título</label>
      <input type="text" id="headline" name="headline" placeholder="Ej: Conocé nuestros servicios" value="${escapeHtml(v.headline)}" />

      <label for="message">Copy</label>
      <textarea id="message" name="message" placeholder="Texto principal que va a ver la gente...">${escapeHtml(v.message)}</textarea>

      <label for="image-dropzone">Imagen</label>
      <div class="dropzone" id="dropzone">
        <input type="file" id="image" name="image" accept="image/*" hidden />
        <div id="dropzoneEmpty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p><strong>Hacé click</strong> o arrastrá una imagen acá</p>
          <p class="hint">PNG o JPG, hasta 8MB</p>
        </div>
        <div id="dropzonePreview" class="dropzone-preview">
          <img id="previewImg" alt="Vista previa" />
          <p class="filename" id="filename"></p>
          <p class="hint"><span class="change-link">Cambiar imagen</span></p>
        </div>
      </div>
      <p class="hint">Sin imagen se crea solo la campaña + el conjunto de anuncios (sin el anuncio final).</p>

      <button type="submit">Crear</button>
    </form>
  </div>`;
}

function statusBadge(status: string): string {
  const cls = status === "ACTIVE" ? "badge-active" : "badge-paused";
  return `<span class="badge ${cls}">${status}</span>`;
}

async function campaignsTable(): Promise<string> {
  const campaigns = await listCampaigns(TEST_AD_ACCOUNT_ID);
  if (campaigns.length === 0) return "";

  const rows = campaigns
    .map(
      (c) =>
        `<tr><td>${c.name}</td><td>${statusBadge(c.status)}</td><td>${c.objective ?? ""}</td><td class="muted">${c.id}</td></tr>`
    )
    .join("");

  return `
  <div class="card">
    <h2>Campañas existentes en esta cuenta</h2>
    <table>
      <tr><th>Nombre</th><th>Estado</th><th>Objetivo</th><th>ID</th></tr>
      ${rows}
    </table>
  </div>`;
}

app.get("/", async (_req, res) => {
  try {
    const table = await campaignsTable();
    res.send(layout(form() + table));
  } catch (err) {
    res.send(
      layout(`<div class="err">Error: ${(err as Error).message}</div>` + form())
    );
  }
});

app.post("/crear", upload.single("image"), async (req, res) => {
  const name = String(req.body.name || "").trim();
  const objective = String(req.body.objective || OBJECTIVES[0].value);
  const budgetArs = Number(req.body.budget);
  const headline = String(req.body.headline || "").trim();
  const message = String(req.body.message || "").trim();
  const image = req.file;
  const submitted: FormValues = { name, objective, budget: req.body.budget, headline, message };

  try {
    if (!budgetArs || budgetArs <= 0) {
      throw new Error("El presupuesto tiene que ser un numero mayor a 0.");
    }

    const campaign = await createTestCampaign(TEST_AD_ACCOUNT_ID, {
      name: name || undefined,
      objective,
      dailyBudgetMinorUnits: Math.round(budgetArs * 100),
    });

    const adSet = await createTestAdSet(TEST_AD_ACCOUNT_ID, campaign.id, {
      name: name ? `${name} - Ad Set` : undefined,
    });

    const created = [
      `Campaña: <strong>${campaign.name}</strong> <code>${campaign.id}</code>`,
      `Ad set: <code>${adSet.id}</code>`,
    ];

    if (image) {
      const imageHash = await uploadAdImage(TEST_AD_ACCOUNT_ID, image.buffer, image.originalname);
      const creativeId = await createAdCreative(TEST_AD_ACCOUNT_ID, {
        pageId: PAGE_ID,
        imageHash,
        link: `https://www.facebook.com/${PAGE_ID}`,
        headline: headline || undefined,
        message: message || "Anuncio de prueba",
      });
      const ad = await createAd(TEST_AD_ACCOUNT_ID, adSet.id, creativeId, name ? `${name} - Ad` : undefined);
      created.push(`Anuncio (con imagen y copy): <code>${ad.id}</code>`);
    }

    const table = await campaignsTable();
    res.send(
      layout(
        `<div class="ok"><strong>Creado correctamente — todo en PAUSED</strong><ul>${created
          .map((c) => `<li>${c}</li>`)
          .join("")}</ul></div>` +
          form() +
          table
      )
    );
  } catch (err) {
    const table = await campaignsTable();
    res.send(
      layout(
        `<div class="err">Error: ${(err as Error).message}</div>` +
          form(submitted) +
          table
      )
    );
  }
});

app.listen(PORT, () => {
  console.log(`Interfaz corriendo en http://localhost:${PORT}`);
});
