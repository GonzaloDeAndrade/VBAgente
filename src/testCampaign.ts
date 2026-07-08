import "dotenv/config";
import {
  initMetaApi,
  createTestCampaign,
  pauseCampaign,
  activateCampaign,
  getCampaign,
} from "./metaClient.js";

// Ad account "Gonzalo Prueba" — cuenta de test indicada explicitamente.
const TEST_AD_ACCOUNT_ID = "act_1652894765898995";

async function main() {
  console.log("=== Test: crear, activar y pausar una campaña ===\n");

  console.log("1. Conectando con la API de Meta...");
  initMetaApi();

  console.log(
    `2. Creando campaña de test en ${TEST_AD_ACCOUNT_ID} (estado PAUSED, presupuesto minimo, sin ad sets ni anuncios -> no puede gastar)...`
  );
  const campaign = await createTestCampaign(TEST_AD_ACCOUNT_ID);
  console.log(`   Creada: "${campaign.name}" (${campaign.id}) [${campaign.status}]\n`);

  console.log("3. Probando activar la campaña...");
  await activateCampaign(campaign.id);
  let current = await getCampaign(campaign.id);
  console.log(`   Estado actual: ${current.status}\n`);

  console.log("4. Probando pausar la campaña...");
  await pauseCampaign(campaign.id);
  current = await getCampaign(campaign.id);
  console.log(`   Estado actual: ${current.status}\n`);

  console.log("=== Test completado ===");
  console.log(
    `La campaña "${current.name}" (${current.id}) quedo en estado ${current.status}.`
  );
  console.log(
    "No tiene ad sets ni anuncios, por lo que nunca pudo entregar ni generar gasto."
  );
  console.log(
    "Podes eliminarla manualmente desde Meta Ads Manager cuando quieras."
  );
}

main().catch((err) => {
  console.error("\nError:", err.message ?? err);
  process.exit(1);
});
