import * as cheerio from "cheerio";
import { generateMessage } from "./aiRouter";
import { loadDb, mutate, nowIso } from "../store/fileStore";
import { AppError } from "../lib/errors";

export async function onboardAgency(url: string) {
  let html = "";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
    } else {
      html = await response.text();
    }
  } catch (err) {
    console.warn(`Could not access agency URL (offline mode): ${err instanceof Error ? err.message : String(err)}`);
    // Proceed with empty HTML to trigger fallback AI behavior smoothly
  }

  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 15000); // 15k chars context limit

  const prompt = `Analyze the following text extracted from an agency website.
Determine their niche, target audience, and up to 5 core services they offer.
For EACH service, generate 2 highly targeted DuckDuckGo search queries designed to find clients looking to buy that specific service.
Format your output STRICTLY as valid JSON. Do not use markdown blocks.

JSON Schema:
{
  "name": "Agency name",
  "description": "Short 1-sentence description of what they do",
  "services": ["Service 1", "Service 2"],
  "searchQueries": [
    { "service": "Service 1", "query": "\\"hire service 1\\" startup" },
    { "service": "Service 1", "query": "\\"looking for\\" service 1" }
  ]
}

Website Text:
${text}`;

  let jsonResult;
  try {
    const aiResponse = await generateMessage(prompt);
    const match = aiResponse.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON structure found in AI response");
    jsonResult = JSON.parse(match[0]);
  } catch (err) {
    console.error("AI parse error:", err);
    throw new AppError("Failed to parse AI response as JSON", "AI_PARSE_ERROR", 500);
  }

  if (!jsonResult || !Array.isArray(jsonResult.services) || !Array.isArray(jsonResult.searchQueries)) {
    throw new AppError("AI returned invalid JSON schema", "AI_SCHEMA_ERROR", 500);
  }

  const profile = {
    url,
    name: jsonResult.name || "Agency",
    description: jsonResult.description || "",
    services: jsonResult.services,
    searchQueries: jsonResult.searchQueries,
  };

  await mutate((db) => {
    db.settings.agencyProfile = profile;
    db.activities.unshift({
      id: crypto.randomUUID(),
      type: "automation",
      text: `Configured agency profile for ${profile.name} with ${profile.services.length} services`,
      createdAt: nowIso(),
    });
  });

  return profile;
}
