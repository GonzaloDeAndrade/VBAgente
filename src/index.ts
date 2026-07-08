import "dotenv/config";
import {
  initMetaApi,
  listAdAccounts,
  listCampaigns,
  getCampaignInsights,
  type CampaignMetrics,
} from "./metaClient.js";
import { suggestForCampaign, averageCpc } from "./suggest.js";

const DATE_PRESET = "last_30d";

async function main() {
  console.log("=== Meta Ads Optimization Agent ===\n");

  console.log("1. Conectando con la API de Meta...");
  initMetaApi();

  console.log("2. Listando ad accounts disponibles...");
  const adAccounts = await listAdAccounts();

  if (adAccounts.length === 0) {
    console.log("   No se encontraron ad accounts para este token.");
    return;
  }

  console.log(`   Se encontraron ${adAccounts.length} ad account(s).\n`);

  console.log(`3. Trayendo campañas y metricas reales (${DATE_PRESET})...\n`);

  for (const acc of adAccounts) {
    let campaigns;
    let metrics: CampaignMetrics[];

    try {
      [campaigns, metrics] = await Promise.all([
        listCampaigns(acc.id),
        getCampaignInsights(acc.id, DATE_PRESET),
      ]);
    } catch (err) {
      console.log(`--- ${acc.name} (${acc.id}) ---`);
      console.log(`   No se pudieron leer datos: ${(err as Error).message}\n`);
      continue;
    }

    if (campaigns.length === 0) {
      console.log(`--- ${acc.name} (${acc.id}) ---`);
      console.log("   Sin campañas en esta ad account.\n");
      continue;
    }

    console.log(`--- ${acc.name} (${acc.id}) ---`);

    const metricsByCampaignId = new Map(metrics.map((m) => [m.campaignId, m]));
    const avgCpc = averageCpc(metrics);

    for (const campaign of campaigns) {
      const campaignMetrics = metricsByCampaignId.get(campaign.id);

      if (!campaignMetrics) {
        console.log(`\n> ${campaign.name} [${campaign.status}]`);
        console.log(`  Sin metricas en el periodo (${DATE_PRESET}).`);
        continue;
      }

      const suggestions = suggestForCampaign(
        campaignMetrics,
        campaign.status,
        avgCpc
      );

      console.log(`\n> ${campaign.name} [${campaign.status}] (${campaign.objective ?? "N/A"})`);
      console.log(
        `  Gasto: ${campaignMetrics.spend.toFixed(2)} | Impresiones: ${campaignMetrics.impressions} | Clicks: ${campaignMetrics.clicks} | CTR: ${campaignMetrics.ctr.toFixed(2)}% | CPC: ${campaignMetrics.cpc.toFixed(2)} | Frecuencia: ${campaignMetrics.frequency.toFixed(2)} | Conversiones: ${campaignMetrics.conversions}`
      );
      for (const suggestion of suggestions) {
        console.log(`  - ${suggestion}`);
      }
    }

    console.log();
  }
}

main().catch((err) => {
  console.error("\nError:", err.message ?? err);
  process.exit(1);
});
