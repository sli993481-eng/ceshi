const BOT_RE =
  /bot|spider|crawler|crawling|httpclient|python-requests|curl\/|wget|go-http|okhttp|libwww|postman|insomnia|headless|phantomjs|selenium|webdriver|playwright|puppeteer|axios\/|node-fetch|undici|bytespider|semrush|ahrefs|mj12bot|petalbot|facebookexternalhit|ia_archiver|yandex|baiduspider|sogou|linkedinbot|applebot|ccbot|amazonbot|dotbot|meta-externalagent|anthropic|perplexity|gptbot|claudebot/i;

export function isObviousBot(ua: string): boolean {
  const agent = ua.trim();
  if (!agent || agent.length < 12) return true;
  if (/HeadlessChrome/i.test(agent)) return true;
  return BOT_RE.test(agent);
}
