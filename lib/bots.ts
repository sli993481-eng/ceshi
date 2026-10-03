const BOT_RE =
  /bot|spider|crawler|crawling|preview|fetch\/|scan|scrap|httpclient|python|curl|wget|go-http|java\/|okhttp|php\/|libwww|postman|insomnia|headless|phantom|selenium|webdriver|playwright|puppeteer|axios|node-fetch|undici|gptbot|claudebot|bytespider|semrush|ahrefs|mj12|petalbot|bingpreview|facebookexternalhit|ia_archiver|slurp|duckduck|yandex|baidu|sogou|exabot|facebot|linkedinbot|twitterbot|whatsapp|telegram|discordbot|slackbot|applebot|ccbot|amazonbot|dotbot|rogerbot|embedly|quora|pinterest|redditbot|vkshare|nuzzel|flipboard|tumblr|bitlybot|skypeuripreview|natchatbot|chatglm|bytespider|petalbot|meta-externalagent|anthropic|perplexity|omgili|dataforseo|serpstat|majestic/i;

export function isObviousBot(
  ua: string,
  headerBag?: { get(name: string): string | null },
): boolean {
  const agent = ua.trim();
  if (!agent || agent.length < 12) return true;
  if (BOT_RE.test(agent)) return true;
  if (/HeadlessChrome/i.test(agent)) return true;
  if (headerBag) {
    const purpose = headerBag.get("x-purpose") || headerBag.get("purpose") || "";
    if (/preview|prefetch|bot/i.test(purpose)) return true;
  }
  return false;
}
