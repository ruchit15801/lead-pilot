import { discoverLeads } from "./src/server/services/scraperService";

async function run() {
  const leads = await discoverLeads([{ service: "Web Development", query: "web development company" }], { maxResults: 5 });
  console.log(JSON.stringify(leads, null, 2));
}

run();
