import type { CampaignMetrics } from "./metaClient.js";

export interface CampaignReport {
  campaignId: string;
  campaignName: string;
  status: string;
  objective?: string;
  metrics: CampaignMetrics;
  suggestions: string[];
}

const LOW_CTR_THRESHOLD = 1; // %
const HIGH_FREQUENCY_THRESHOLD = 3.5;
const HIGH_CPC_MULTIPLIER = 1.5;

/**
 * Genera sugerencias simples basadas en reglas fijas (sin IA) a partir de
 * las metricas reales de una campaña.
 */
export function suggestForCampaign(
  metrics: CampaignMetrics,
  status: string,
  avgCpc: number
): string[] {
  const suggestions: string[] = [];

  if (metrics.impressions === 0) {
    suggestions.push(
      "Sin impresiones en el periodo analizado. Revisa el presupuesto, el estado de la campaña o si los anuncios siguen en revision."
    );
    return suggestions;
  }

  if (metrics.ctr < LOW_CTR_THRESHOLD) {
    suggestions.push(
      `CTR bajo (${metrics.ctr.toFixed(2)}%). Proba nuevas creatividades, copys o ajusta la segmentacion de audiencia.`
    );
  }

  if (metrics.frequency > HIGH_FREQUENCY_THRESHOLD) {
    suggestions.push(
      `Frecuencia alta (${metrics.frequency.toFixed(2)}). La misma audiencia esta viendo el anuncio muchas veces: riesgo de fatiga publicitaria. Renova el creativo o ampliá la audiencia.`
    );
  }

  if (metrics.spend > 0 && metrics.conversions === 0) {
    suggestions.push(
      `Se gastaron ${metrics.spend.toFixed(2)} sin conversiones registradas. Revisa el pixel/seguimiento de conversiones o la landing page.`
    );
  }

  if (avgCpc > 0 && metrics.clicks > 0 && metrics.cpc > avgCpc * HIGH_CPC_MULTIPLIER) {
    suggestions.push(
      `CPC (${metrics.cpc.toFixed(2)}) muy por encima del promedio de tus campañas (${avgCpc.toFixed(2)}). Revisa la puja o la competencia por la audiencia.`
    );
  }

  if (status === "ACTIVE" && metrics.spend === 0) {
    suggestions.push(
      "Campaña activa sin gasto en el periodo. Puede estar limitada por presupuesto, audiencia muy chica, o en revision de Meta."
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Sin alertas relevantes. El rendimiento esta dentro de rangos esperados."
    );
  }

  return suggestions;
}

/**
 * Calcula el CPC promedio entre campañas con clicks, para usarlo como
 * referencia relativa al evaluar cada campaña individual.
 */
export function averageCpc(allMetrics: CampaignMetrics[]): number {
  const withClicks = allMetrics.filter((m) => m.clicks > 0);
  if (withClicks.length === 0) return 0;
  const total = withClicks.reduce((sum, m) => sum + m.cpc, 0);
  return total / withClicks.length;
}
