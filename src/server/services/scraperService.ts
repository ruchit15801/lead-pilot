import * as cheerio from "cheerio";
import { withRetry, isRetriableHttp } from "../lib/retry";

// ─── Types ──────────────────────────────────────────────────────
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ExtractedContact {
  emails: string[];
  phones: string[];
  companyName: string;
  description: string;
  title: string;
  domain: string;
  socials: string[];
}

export interface ScrapedLead {
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  source: string;
  service?: string;
  sourceUrl: string;
  scrapedAt: string;
}

// ─── Geo-Rotator Config ──────────────────────────────────────────
const GLOBAL_CITIES = [
  "New York", "San Francisco", "London", "Austin", "Los Angeles",
  "Chicago", "Toronto", "Sydney", "Berlin", "Singapore",
  "Seattle", "Boston", "Denver", "Miami", "Dubai", "Vancouver",
  "Dallas", "Atlanta", "Melbourne", "Dublin", "Amsterdam", "Paris",
  "Stockholm", "Tokyo", "Mumbai", "Bangalore", "San Diego", "Houston",
  "Philadelphia", "Phoenix", "San Antonio", "San Jose", "Charlotte",
  "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Bristol",
  "Montreal", "Calgary", "Ottawa", "Edmonton", "Brisbane", "Perth",
  "Auckland", "Wellington", "Christchurch", "Munich", "Frankfurt",
  "Hamburg", "Stuttgart", "Zurich", "Geneva", "Vienna", "Copenhagen",
  "Oslo", "Helsinki", "Barcelona", "Madrid", "Milan", "Rome"
];

const MODIFIERS = [
  "top", "best", "expert", "professional", "services", "agency", "company",
  "award winning", "boutique", "consulting", "specialists", "innovative",
  "b2b", "solutions", "firm", "group", "partners"
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/120.0",
];

function getRandomAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── Multi-Engine Universal Search ────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  return withRetry(
    async () => {
      const response = await fetch(url, {
        headers: {
          "User-Agent": getRandomAgent(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        if (isRetriableHttp(response.status) || response.status === 403) {
          throw new Error(`HTTP ${response.status}`);
        }
        throw new Error(`Search failed: ${response.status}`);
      }
      return response.text();
    },
    { maxAttempts: 2, baseDelayMs: 1000 },
  );
}

export async function searchBing(query: string, limit = 10): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $("li.b_algo").each((_i, el) => {
    if (results.length >= limit) return false;
    const link = $(el).find("h2 a").attr("href");
    const title = $(el).find("h2 a").text().trim();
    const snippet = $(el).find(".b_caption p").text().trim();
    if (link && link.startsWith("http") && !link.includes("microsoft.com") && !link.includes("bing.com")) {
      results.push({ title, url: link, snippet });
    }
  });
  return results;
}

export async function searchYahoo(query: string, limit = 10): Promise<SearchResult[]> {
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $(".algo-sr").each((_i, el) => {
    if (results.length >= limit) return false;
    const link = $(el).find("a").attr("href");
    const title = $(el).find(".title a").text().trim();
    const snippet = $(el).find(".compText").text().trim();
    if (link && link.startsWith("http") && !link.includes("yahoo.com")) {
      // Yahoo wraps urls in their redirector sometimes
      const actualUrlMatch = /RU=([^/]+)/.exec(link);
      const actualUrl = actualUrlMatch ? decodeURIComponent(actualUrlMatch[1]) : link;
      results.push({ title, url: actualUrl, snippet });
    }
  });
  return results;
}

export async function searchDuckDuckGo(query: string, limit = 10): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $(".result").each((_i, element) => {
    if (results.length >= limit) return false;
    const link = $(element).find(".result__a");
    const snippet = $(element).find(".result__snippet");
    const href = link.attr("href") ?? "";
    const title = link.text().trim();
    const text = snippet.text().trim();

    let actualUrl = href;
    if (href.includes("uddg=")) {
      const match = /uddg=([^&]+)/.exec(href);
      if (match?.[1]) actualUrl = decodeURIComponent(match[1]);
    }
    if (actualUrl.startsWith("http") && title) {
      results.push({ title, url: actualUrl, snippet: text });
    }
  });
  return results;
}

async function universalSearch(query: string, maxResults = 10): Promise<SearchResult[]> {
  const promises = [
    searchDuckDuckGo(query, maxResults).catch(() => []),
    searchBing(query, maxResults).catch(() => []),
    searchYahoo(query, maxResults).catch(() => []),
  ];
  
  const results = await Promise.all(promises);
  const combined = results.flat();
  // Deduplicate by URL
  const unique = Array.from(new Map(combined.map(r => [r.url, r])).values());
  return unique.slice(0, maxResults);
}


// ─── Deep Web page scraper + contact extractor ───────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

const JUNK_EMAIL_DOMAINS = new Set([
  "example.com", "example.org", "test.com", "sentry.io", "w3.org", "schema.org",
  "googleapis.com", "google.com", "facebook.com", "twitter.com", "github.com",
  "wixpress.com", "wordpress.com", "squarespace.com", "sentry.io", "namecheap.com"
]);

const BLOCKED_DOMAINS = new Set([
  "facebook.com", "twitter.com", "instagram.com", "youtube.com", "tiktok.com",
  "reddit.com", "wikipedia.org", "amazon.com", "linkedin.com", "google.com",
  "github.com", "stackoverflow.com", "medium.com", "pinterest.com", "quora.com",
  "yelp.com", "craigslist.org", "yellowpages.com"
]);

const DIRECTORY_PLATFORMS = new Set([
  "upwork.com", "fiverr.com", "freelancer.com", "toptal.com", "contra.com", "guru.com", "peopleperhour.com", "99designs.com", "braintrust.com", "malt.com", "solidgigs.com", "catalant.com", "hubstafftalent.net", "truelancer.com", "outsourcely.com", "workgenius.com", "yunojuno.com", "workana.com", "nubelo.com", "freelancermap.com", "codeable.io", "clouddevs.com", "dribbble.com", "behance.net", "cloudpeeps.com", "flexc.work", "crossover.com",
  "gun.io", "arc.dev", "lemon.io", "turing.com", "x-team.com", "pangea.ai", "a.team", "andela.com",
  "clutch.co", "goodfirms.co", "designrush.com", "upcity.com", "sortlist.com", "agencyspotter.com", "topdevelopers.co", "appfutura.com", "findbestfirms.com", "truefirms.co", "aciety.com", "itprofiles.com", "itfirms.co", "selectedfirms.co", "50pros.com", "techbehemoths.com", "crowdreviews.com", "themanifest.com",
  "g2.com", "capterra.com", "softwareadvice.com", "trustradius.com", "trustpilot.com",
  "weworkremotely.com", "remoteok.com", "flexjobs.com", "remote.co", "justremote.co", "workingnomads.com", "remotive.com", "nodesk.co", "jobspresso.co", "skipthedrive.com", "virtualvocations.com", "wellfound.com",
  "crunchbase.com", "f6s.com", "ycombinator.com", "owler.com", "pitchbook.com", "tracxn.com", "inc42.com", "yourstory.com",
  "builtwith.com", "wappalyzer.com",
  "sam.gov", "govwin.com", "eprocure.gov.in", "gem.gov.in"
]);

export function isValidCompanyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const domain = parsed.hostname.replace(/^www\./, "");
    if (BLOCKED_DOMAINS.has(domain)) return false;
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname.startsWith("127.") ||
      parsed.hostname.startsWith("10.") ||
      parsed.hostname.startsWith("192.168.") ||
      parsed.hostname.startsWith("169.254.") ||
      parsed.hostname === "0.0.0.0"
    ) return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

async function safeFetchHtml(url: string): Promise<{ html: string; $?: ReturnType<typeof cheerio.load> }> {
  const response = await fetch(url, {
    headers: { "User-Agent": getRandomAgent(), Accept: "text/html" },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });
  if (!response.ok) throw new Error("bad status");
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) throw new Error("not html");
  const html = await response.text();
  if (html.length > 3_000_000) throw new Error("too large");
  return { html, $: cheerio.load(html) };
}

async function extractActualWebsite(directoryUrl: string): Promise<string | null> {
  try {
    const { html, $ } = await safeFetchHtml(directoryUrl);
    if (!$) return null;
    
    let externalUrl: string | null = null;
    const directoryHost = new URL(directoryUrl).hostname.replace(/^www\./, "");
    
    // Look for website links via prominent text or any external link
    $("a").each((_i, el) => {
      if (externalUrl) return;
      let href = $(el).attr("href");
      if (!href) return;
      if (href.startsWith("/url?q=")) {
        href = decodeURIComponent(href.replace("/url?q=", "").split("&")[0]);
      }
      try {
        const linkUrl = new URL(href, directoryUrl);
        if (["http:", "https:"].includes(linkUrl.protocol)) {
          const linkHost = linkUrl.hostname.replace(/^www\./, "");
          if (linkHost !== directoryHost && !BLOCKED_DOMAINS.has(linkHost) && !DIRECTORY_PLATFORMS.has(linkHost)) {
            externalUrl = linkUrl.toString();
          }
        }
      } catch { }
    });
    
    if (!externalUrl) {
      const text = $("body").text();
      const match = text.match(/[a-zA-Z0-9-]+\.(com|io|co|net|org|ai|dev)/);
      if (match && !BLOCKED_DOMAINS.has(match[0]) && !DIRECTORY_PLATFORMS.has(match[0])) {
         externalUrl = `https://${match[0]}`;
      }
    }
    return externalUrl;
  } catch {
    return null;
  }
}

function extractDataFromText(text: string, $: ReturnType<typeof cheerio.load>, existingEmails: string[], existingPhones: string[]) {
  const rawEmails = Array.from(new Set(text.match(EMAIL_REGEX) ?? []));
  rawEmails.forEach((email) => {
    email = email.toLowerCase();
    const domain = email.split("@")[1];
    if (domain && !JUNK_EMAIL_DOMAINS.has(domain) && !existingEmails.includes(email)) {
      existingEmails.push(email);
    }
  });

  $('a[href^="mailto:"]').each((_i, element) => {
    const href = $(element).attr("href") ?? "";
    const email = href.replace("mailto:", "").split("?")[0].toLowerCase().trim();
    if (email && email.includes("@") && !JUNK_EMAIL_DOMAINS.has(email.split("@")[1])) {
      if (!existingEmails.includes(email)) existingEmails.push(email);
    }
  });

  const rawPhones = text.match(PHONE_REGEX) ?? [];
  rawPhones.forEach((phone) => {
    phone = phone.replace(/\s+/g, " ").trim();
    if (phone.replace(/\D/g, "").length >= 7 && !existingPhones.includes(phone)) {
      existingPhones.push(phone);
    }
  });

  $('a[href^="tel:"]').each((_i, element) => {
    const href = $(element).attr("href") ?? "";
    const phone = href.replace("tel:", "").trim();
    if (phone && !existingPhones.includes(phone)) existingPhones.push(phone);
  });
}

export async function scrapeContactsFromUrl(pageUrl: string): Promise<ExtractedContact | null> {
  try {
    const { html, $ } = await safeFetchHtml(pageUrl);
    if (!$) return null;

    $("script, style, noscript, svg, iframe").remove();
    $("div, p, br, h1, h2, h3, h4, h5, h6, li, td, th, a, span").append(" ");
    const text = $("body").text();

    const emails: string[] = [];
    const phones: string[] = [];
    const socials: string[] = [];

    // Extract from homepage
    extractDataFromText(text, $, emails, phones);

    $('a[href^="http"]').each((_i, el) => {
      const href = $(el).attr("href")?.toLowerCase() || "";
      if (href.includes("linkedin.com/company") || href.includes("twitter.com")) {
        if (!socials.includes(href)) socials.push(href);
      }
    });

    // Deep Crawl: Find contact, about, team pages
    const subPagesToCrawl = new Set<string>();
    $("a").each((_i, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const lower = href.toLowerCase();
      if (lower.includes("contact") || lower.includes("about") || lower.includes("team")) {
        try {
          const absoluteUrl = new URL(href, pageUrl).toString();
          if (absoluteUrl.startsWith("http") && new URL(absoluteUrl).hostname === new URL(pageUrl).hostname) {
            subPagesToCrawl.add(absoluteUrl);
          }
        } catch { /* ignore bad urls */ }
      }
    });

    // Crawl up to 3 subpages concurrently
    const subUrls = Array.from(subPagesToCrawl).slice(0, 3);
    if (subUrls.length > 0) {
      await Promise.allSettled(
        subUrls.map(async (subUrl) => {
          try {
            const res = await safeFetchHtml(subUrl);
            if (res.$) {
              res.$("script, style, noscript").remove();
              res.$("div, p, br, h1, h2, h3, h4, h5, h6, li, td, th, a, span").append(" ");
              extractDataFromText(res.$("body").text(), res.$, emails, phones);
            }
          } catch { /* ignore failures on subpages */ }
        })
      );
    }

    const companyName = $('meta[property="og:site_name"]').attr("content")?.trim() ||
      $('meta[name="application-name"]').attr("content")?.trim() ||
      $("title").text().split(/[|\-–—]/)[0]?.trim() || "";

    const description = $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() || "";

    return {
      emails: emails.slice(0, 5),
      phones: phones.slice(0, 3),
      companyName: companyName.slice(0, 200),
      description: description.slice(0, 500),
      title: $("h1").first().text().trim().slice(0, 100),
      domain: new URL(pageUrl).hostname.replace(/^www\./, ""),
      socials,
    };
  } catch (e) {
    return null;
  }
}

function generateDorks(baseQuery: string): string[] {
  const city = getRandom(GLOBAL_CITIES);
  const city2 = getRandom(GLOBAL_CITIES);
  const mod = getRandom(MODIFIERS);
  const mod2 = getRandom(MODIFIERS);

  return [
    `${mod} ${baseQuery} ${city}`,
    `site:clutch.co/profile "${baseQuery}" "${city}"`,
    `site:upwork.com/agencies "${baseQuery}"`,
    `site:linkedin.com/company "${baseQuery}" "${mod}"`,
    `"${baseQuery}" ${mod2} ${city2}`,
    `site:crunchbase.com/organization "${baseQuery}"`,
    `site:trustpilot.com/review "${baseQuery}"`,
    `"${baseQuery}" "${city}" "contact"`,
    `${baseQuery} ${mod} in ${city}`
  ];
}

// ─── Full scrape pipeline ───────────────────────────────────────
export async function discoverLeads(
  queries: Array<{ service: string; query: string }>,
  options: { maxResults?: number; excludeDomains?: string[] } = {},
): Promise<ScrapedLead[]> {
  const maxResults = options.maxResults ?? 20;
  const excludeDomains = options.excludeDomains ?? [];
  const seen = new Set<string>(excludeDomains);
  const leads: ScrapedLead[] = [];

  // Global timeout guard — always return what we have before Vercel kills us
  const TIMEOUT_MS = 45_000;
  const startTime = Date.now();
  const isTimedOut = () => Date.now() - startTime > TIMEOUT_MS;

  for (let queryIndex = 0; queryIndex < queries.length; queryIndex++) {
    if (leads.length >= maxResults || isTimedOut()) break;
    const baseQuery = queries[queryIndex];
    
    // Generate massive Dork expansion and pick top 4 randomly
    const dorks = generateDorks(baseQuery.query).sort(() => Math.random() - 0.5).slice(0, 4);

    // Run dork searches concurrently
    const searchPromises = dorks.map(dork => universalSearch(dork, 15).catch(() => [] as SearchResult[]));
    const searchResultsArrays = await Promise.all(searchPromises);
    const allResults = searchResultsArrays.flat();
    
    // Shuffle the results to get a diverse mix
    allResults.sort(() => Math.random() - 0.5);

    // Process URLs concurrently in batches of 5 to dramatically speed up scraping
    for (let i = 0; i < allResults.length; i += 5) {
      if (leads.length >= maxResults || isTimedOut()) break;
      const batch = allResults.slice(i, i + 5);
      
      await Promise.all(batch.map(async (result) => {
        if (leads.length >= maxResults || isTimedOut()) return;
        if (!isValidCompanyUrl(result.url)) return;

        let finalUrl = result.url;
        const initialDomain = normalizeDomain(finalUrl);

        // The Directory Hopper
        if (DIRECTORY_PLATFORMS.has(initialDomain)) {
          const actualSite = await extractActualWebsite(finalUrl);
          if (!actualSite) return; // Skip if we couldn't hop out
          finalUrl = actualSite;
        }

        const domain = normalizeDomain(finalUrl);
        if (seen.has(domain)) return;
        seen.add(domain);

        // Deep Deep Crawl
        const contacts = await scrapeContactsFromUrl(finalUrl);
        if (!contacts) return;
        if (contacts.emails.length === 0 && contacts.phones.length === 0) return;

        const lead: ScrapedLead = {
          name: contacts.companyName || result.title.split(/[|\-–—]/)[0].trim() || domain,
          company: contacts.companyName || domain,
          role: contacts.title || "Decision Maker",
          email: contacts.emails[0],
          phone: contacts.phones[0],
          source: "scraper",
          service: baseQuery.service,
          sourceUrl: finalUrl,
          scrapedAt: new Date().toISOString(),
        };

        leads.push(lead);
      }));
    }
  }

  // Final slice to perfectly match requested number due to concurrency overshoots
  return leads.slice(0, maxResults);
}

