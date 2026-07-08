import bizSdk from "facebook-nodejs-business-sdk";

const { FacebookAdsApi, User } = bizSdk;

export interface AdAccountSummary {
  id: string;
  name: string;
  accountStatus: number;
  currency: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  objective?: string;
}

/**
 * Inicializa el SDK de Meta con el access token del .env.
 * Lanza un error claro si falta la credencial.
 */
export function initMetaApi(): void {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "Falta META_ACCESS_TOKEN en el archivo .env. Copia .env.example a .env y completa las credenciales."
    );
  }
  FacebookAdsApi.init(accessToken);
}

/**
 * Lista las ad accounts disponibles para el usuario autenticado (token "me").
 */
export async function listAdAccounts(): Promise<AdAccountSummary[]> {
  const me = new User("me");
  const accounts = await me.getAdAccounts([
    "id",
    "name",
    "account_status",
    "currency",
  ]);

  return accounts.map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    accountStatus: acc.account_status,
    currency: acc.currency,
  }));
}

/**
 * Lista las campañas de una ad account puntual.
 */
export async function listCampaigns(
  adAccountId: string
): Promise<CampaignSummary[]> {
  const { AdAccount } = bizSdk;
  const account = new AdAccount(adAccountId);
  const campaigns = await account.getCampaigns([
    "id",
    "name",
    "status",
    "objective",
  ]);

  return campaigns.map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
  }));
}

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  frequency: number;
  reach: number;
  conversions: number;
}

const CONVERSION_ACTION_TYPES = [
  "purchase",
  "lead",
  "complete_registration",
  "add_to_cart",
  "initiate_checkout",
  "submit_application",
  "schedule",
];

function sumConversions(actions: any[] | undefined): number {
  if (!Array.isArray(actions)) return 0;
  return actions
    .filter((a) =>
      CONVERSION_ACTION_TYPES.some((type) => a.action_type?.includes(type))
    )
    .reduce((sum, a) => sum + Number(a.value ?? 0), 0);
}

/**
 * Trae metricas reales de rendimiento por campaña (insights) de una ad account,
 * para un rango de fechas dado (por defecto los ultimos 30 dias).
 */
export async function getCampaignInsights(
  adAccountId: string,
  datePreset: string = "last_30d"
): Promise<CampaignMetrics[]> {
  const { AdAccount } = bizSdk;
  const account = new AdAccount(adAccountId);

  const insights = await account.getInsights(
    [
      "campaign_id",
      "campaign_name",
      "spend",
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "frequency",
      "reach",
      "actions",
    ],
    {
      level: "campaign",
      date_preset: datePreset,
    }
  );

  return insights.map((row: any) => ({
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    ctr: Number(row.ctr ?? 0),
    cpc: Number(row.cpc ?? 0),
    frequency: Number(row.frequency ?? 0),
    reach: Number(row.reach ?? 0),
    conversions: sumConversions(row.actions),
  }));
}

export type CampaignStatus = "ACTIVE" | "PAUSED";

export interface CreateTestCampaignOptions {
  name?: string;
  objective?: string;
  /** Presupuesto diario en la unidad minima de la moneda de la cuenta (ej: centavos). */
  dailyBudgetMinorUnits?: number;
}

// Presupuesto por defecto para campañas de test: suficientemente alto para
// pasar las validaciones minimas de Meta en cualquier moneda, pero irrelevante
// en la practica porque la campaña no tiene ad sets ni anuncios, asi que nunca
// entrega ni gasta, sin importar el presupuesto o el estado.
const DEFAULT_TEST_DAILY_BUDGET_MINOR_UNITS = 1_000_000;

/**
 * Crea una campaña simple de test, en estado PAUSED y con presupuesto minimo,
 * para no gastar nada. No crea ad sets ni anuncios, por lo que nunca puede
 * entregar ni generar costo real.
 */
export async function createTestCampaign(
  adAccountId: string,
  options: CreateTestCampaignOptions = {}
): Promise<CampaignSummary> {
  const { AdAccount } = bizSdk;
  const account = new AdAccount(adAccountId);

  const name = options.name ?? `Test Agente Meta Ads - ${new Date().toISOString()}`;
  const objective = options.objective ?? "OUTCOME_TRAFFIC";
  const dailyBudget =
    options.dailyBudgetMinorUnits ?? DEFAULT_TEST_DAILY_BUDGET_MINOR_UNITS;

  const created: any = await account.createCampaign([], {
    name,
    objective,
    status: "PAUSED",
    special_ad_categories: [],
    daily_budget: dailyBudget,
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  });

  return getCampaign(created.id);
}

/**
 * Trae el estado actual de una campaña por ID.
 */
export async function getCampaign(campaignId: string): Promise<CampaignSummary> {
  const { Campaign } = bizSdk;
  const campaign = new Campaign(campaignId);
  const data: any = await campaign.read(["id", "name", "status", "objective"]);

  return {
    id: data.id,
    name: data.name,
    status: data.status,
    objective: data.objective,
  };
}

/**
 * Cambia el estado (ACTIVE/PAUSED) de una campaña por ID.
 */
export async function setCampaignStatus(
  campaignId: string,
  status: CampaignStatus
): Promise<void> {
  const { Campaign } = bizSdk;
  const campaign = new Campaign(campaignId);
  // El SDK de Meta solo envia en el POST los campos asignados como propiedad
  // (los registra en un objeto interno "_changes"). Pasar { status } directo
  // a update() no alcanza: hay que asignar la propiedad primero.
  campaign.status = status;
  await campaign.update();
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  await setCampaignStatus(campaignId, "PAUSED");
}

export async function activateCampaign(campaignId: string): Promise<void> {
  await setCampaignStatus(campaignId, "ACTIVE");
}

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Llamadas directas a la Graph API (en vez del SDK) para crear ad sets,
// subir imagenes, creatives y ads: el SDK de Node demostro ser poco confiable
// para operaciones de escritura (ver bug de update() con campos directos).
async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta META_ACCESS_TOKEN en el archivo .env.");
  }
  const body = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${GRAPH_BASE}/${path}`, { method: "POST", body });
  const data: any = await res.json();
  if (data.error) {
    throw new Error(data.error.error_user_msg || data.error.message);
  }
  return data;
}

export interface CreateAdSetOptions {
  name?: string;
  countries?: string[];
}

/**
 * Crea un ad set simple con segmentacion abierta (solo pais, sin intereses
 * ni audiencias de retargeting). Queda en PAUSED.
 *
 * No lleva presupuesto propio: la campaña creada por createTestCampaign ya
 * usa Campaign Budget Optimization (presupuesto a nivel campaña), y Meta no
 * permite presupuesto en ambos niveles a la vez.
 */
export async function createTestAdSet(
  adAccountId: string,
  campaignId: string,
  options: CreateAdSetOptions = {}
): Promise<{ id: string }> {
  const data = await graphPost(`${adAccountId}/adsets`, {
    name: options.name ?? `Test Ad Set - ${new Date().toISOString()}`,
    campaign_id: campaignId,
    status: "PAUSED",
    billing_event: "IMPRESSIONS",
    optimization_goal: "LINK_CLICKS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: JSON.stringify({
      geo_locations: { countries: options.countries ?? ["AR"] },
    }),
  });
  return { id: data.id };
}

/**
 * Sube una imagen a la libreria de la ad account y devuelve su hash.
 */
export async function uploadAdImage(
  adAccountId: string,
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta META_ACCESS_TOKEN en el archivo .env.");
  }
  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("filename", new Blob([new Uint8Array(fileBuffer)]), filename);

  const res = await fetch(`${GRAPH_BASE}/${adAccountId}/adimages`, {
    method: "POST",
    body: form,
  });
  const data: any = await res.json();
  if (data.error) {
    throw new Error(data.error.error_user_msg || data.error.message);
  }
  const key = Object.keys(data.images)[0];
  return data.images[key].hash;
}

export interface CreateAdCreativeOptions {
  name?: string;
  pageId: string;
  imageHash: string;
  link: string;
  message: string;
  /** Titulo del anuncio (se muestra debajo de la imagen). Si no se manda,
   * Meta lo autogenera a partir de los metadatos del link (la Pagina). */
  headline?: string;
}

/**
 * Crea el ad creative (contenido: imagen + titulo + copy) atado a una Pagina.
 */
export async function createAdCreative(
  adAccountId: string,
  options: CreateAdCreativeOptions
): Promise<string> {
  const linkData: Record<string, unknown> = {
    image_hash: options.imageHash,
    link: options.link,
    message: options.message,
  };
  if (options.headline) {
    linkData.name = options.headline;
  }

  const data = await graphPost(`${adAccountId}/adcreatives`, {
    name: options.name ?? `Test Creative - ${new Date().toISOString()}`,
    object_story_spec: JSON.stringify({
      page_id: options.pageId,
      link_data: linkData,
    }),
  });
  return data.id;
}

/**
 * Crea el Ad final, conectando el ad set con el creative. Queda en PAUSED.
 */
export async function createAd(
  adAccountId: string,
  adSetId: string,
  creativeId: string,
  name?: string
): Promise<{ id: string }> {
  const data = await graphPost(`${adAccountId}/ads`, {
    name: name ?? `Test Ad - ${new Date().toISOString()}`,
    adset_id: adSetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: "PAUSED",
  });
  return { id: data.id };
}
