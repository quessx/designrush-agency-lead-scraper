# DesignRush Agency Lead Scraper

This Actor collects **agency/company leads** from DesignRush category pages (e.g. web development companies). It visits each company profile and extracts structured data (website, email, rating, services, industries, social links, etc.).

### What it scrapes

- **Category page** example: `https://www.designrush.com/agency/web-development-companies`

### Output (Dataset item)

Each dataset item is a JSON object with fields:

- **name**: Company name
- **profileUrl**: DesignRush profile URL
- **website**: Company website (if available)
- **email**: Email extracted from `mailto:` or **JSON-LD** (`application/ld+json`) when present
- **logoUrl**
- **location**
- **hourlyRate**
- **minProjectSize**
- **employees**
- **yearFounded**
- **rating**
- **reviewsCount**
- **services**: Array of services (taken from `#services .profile-services ...`)
- **industries**: Array of industries (taken from `.profile-block.industries ...`)
- **socialLinks**: `{ linkedin, facebook, twitter, instagram }`
- **portfolioCount**
- **scrapedAt**: ISO timestamp

### Input parameters

All inputs are defined in `.actor/input_schema.json` and visible in Apify UI.

- **startUrls** *(required)*: Category URL(s). For MVP we recommend **exactly one category**.
- **maxItems** *(default: 50, 0 = unlimited)*: Max number of profile pages to process.
- **startPage** *(default: 1)*: Start from this page number (1-based). Useful to resume.
- **maxPages** *(default: 0, 0 = unlimited)*: Max number of category pages to process.
- **requiredFields** *(default: empty)*: Only push leads that have **ALL** selected fields filled.
  - Supported values: `email`, `website`, `linkedin`, `facebook`, `twitter`, `instagram`
- **proxyConfiguration**: Proxy settings (recommended to use Apify Proxy for reliability).

### Examples

Scrape first 3 pages, maximum 100 profiles:

```json
{
  "startUrls": [{ "url": "https://www.designrush.com/agency/web-development-companies" }],
  "maxItems": 100,
  "startPage": 1,
  "maxPages": 3,
  "requiredFields": ["email", "website"],
  "proxyConfiguration": { "useApifyProxy": true }
}
```

Resume from page 10 and scrape 5 pages:

```json
{
  "startUrls": [{ "url": "https://www.designrush.com/agency/web-development-companies" }],
  "maxItems": 0,
  "startPage": 10,
  "maxPages": 5,
  "requiredFields": [],
  "proxyConfiguration": { "useApifyProxy": true }
}
```

### Notes / troubleshooting

- **Email may be missing** if the profile does not provide it (or does not include JSON-LD with `email`).
- If DesignRush changes markup, update selectors in `src/selectors.ts` and extraction helpers in `src/utils.ts`.
