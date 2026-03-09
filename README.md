# Marketer Companion

Chrome extension for SEO, Search Console, GA4, page diagnostics, and lightweight PPC reporting from one popup.

## Overview

Marketer Companion is a browser-native Chrome extension that helps marketers and SEO teams inspect the current page, review Search Console data, run a live Lighthouse-based test, view GA4 reports, and run a quick on-page audit without switching between multiple tools.

This repository is intentionally simple:

- no backend
- no build step
- no npm setup
- no framework
- direct Google API integration from the extension

## Quick Start

### 1. Configure Google credentials

Open [config.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/config.js) and review:

- `CLIENT_ID`
- `CLIENT_SECRET`
- `SCOPES`
- `PSI_API_KEY`

You will typically need:

- Google Search Console API enabled
- Google Analytics Admin API enabled
- Google Analytics Data API enabled
- an OAuth client that works with the extension auth flow
- an optional PageSpeed Insights API key

### 2. Load the extension

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this project folder

### 3. Start using it

1. Open any public page in Chrome
2. Click the extension icon
3. Open `Marketer Companion`
4. Sign in with Google if prompted
5. Choose a Search Console property
6. Run the feature you need

## Screenshots

Add screenshots here if you want this README to feel complete on GitHub:

- popup home / indexing panel
- GA4 analytics panel
- live test results
- on-page audit results

Suggested image folder:

- `docs/screenshots/`

Example markdown:

```md
![Indexing Panel](docs/screenshots/indexing.png)
![GA4 Analytics](docs/screenshots/ga4.png)
```

## Feature Set

### Search Console URL Inspection

- inspect a page URL against the selected Search Console property
- view verdict, coverage state, last crawl, robots state, and canonical details
- open the same inspection directly in Search Console

### Live Test

- runs a PageSpeed Insights / Lighthouse-based live audit
- shows lab metrics, CrUX field data, opportunities, and screenshot output
- retries with desktop strategy if a mobile Lighthouse run fails server-side

### Search Console Performance

- loads clicks, impressions, CTR, and average position
- works for a single page or the whole property
- supports 7d, 30d, 90d, and custom ranges

### Google Analytics 4

- loads GA4 properties from the user account
- attempts to detect the active tab's GA4 property
- runs reports with selectable range, dimension, and metric
- supports previous-period comparison and CSV export

### On-Page Audit

- audits title, meta description, robots, canonical, headings, links, images, and JSON-LD
- runs directly on the active page
- useful even when Search Console access is not available

### PPC via GA4

- shows Google Ads campaign clicks, impressions, CTR, and lead counts through GA4
- supports custom lead event names
- exports CSV

Note:

- this relies on GA4 and Google Ads being linked
- it does not use the Google Ads API directly

## Tech Stack

This codebase uses:

- `Chrome Extension Manifest V3`
- `HTML`
- `CSS`
- `Vanilla JavaScript ES Modules`
- `chrome.identity`
- `chrome.storage`
- `chrome.scripting`
- `chrome.runtime.sendMessage`
- `Google OAuth 2.0 with PKCE`
- `Google Search Console API`
- `Google Analytics Admin API`
- `Google Analytics Data API`
- `Google PageSpeed Insights API`

This codebase does not use:

- React
- TypeScript
- Node.js runtime
- bundlers like Vite or Webpack
- a backend server

## Repository Structure

- [manifest.json](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/manifest.json)
  Chrome extension manifest, permissions, popup entry, and background service worker definition.

- [background.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/background.js)
  OAuth handling, token refresh, Google API calls, GA helpers, and message routing.

- [config.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/config.js)
  OAuth client settings, scopes, and optional PSI API key.

- [popup.html](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/popup.html)
  Popup layout and embedded styling.

- [popup.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/popup.js)
  UI initialization, navigation, rendering, GA reporting, Search Console actions, and on-page audit logic.

- [Content/ppc.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/Content/ppc.js)
  PPC panel injection and campaign report rendering.

- [privacy.html](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/privacy.html)
  Privacy page linked from the popup footer.

- [icons](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/icons)
  Extension icons.

## How It Works

The extension is split into three practical layers.

### 1. Popup layer

The popup is the UI users interact with. It contains:

- property selector
- URL input
- sidebar navigation
- feature panels
- result cards
- raw JSON output
- signed-in account display

Main files:

- [popup.html](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/popup.html)
- [popup.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/popup.js)
- [Content/ppc.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/Content/ppc.js)

### 2. Background layer

The background service worker handles:

- Google sign-in
- token storage
- token refresh
- Google API requests
- property coverage checks
- runtime message handling

Main file:

- [background.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/background.js)

### 3. Active-tab execution layer

For some features, the extension injects code into the active tab using the Chrome scripting API.

This is used for:

- on-page audit
- GA measurement ID detection

## Authentication Flow

Authentication is implemented in [background.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/background.js) using OAuth 2.0 with PKCE.

Flow:

1. The popup requests data like Search Console properties or GA4 properties.
2. The background worker checks for a stored token in `chrome.storage.local`.
3. If the access token is still valid, it reuses it.
4. If expired and a refresh token exists, it refreshes the token.
5. If no valid token exists, it launches the Google auth flow with `chrome.identity.launchWebAuthFlow`.
6. Google returns an auth code to the extension redirect URI.
7. The extension exchanges that code for access and refresh tokens.
8. The token is stored locally and used for future API calls.

Scopes requested by the current code include:

- `openid`
- `email`
- Search Console scopes
- Analytics read-only scope

## Step-by-Step User Flow

This is the practical flow a user follows in the extension.

### Initial popup flow

1. Open a page in Chrome.
2. Open the extension popup.
3. The extension reads the current tab URL.
4. It loads the signed-in account state if a token already exists.
5. It fetches Search Console properties.
6. It tries to auto-match the current page to the best property.

### Indexing flow

1. Keep or paste the page URL.
2. Select a Search Console property.
3. Click `Inspect`.
4. The popup sends `inspect`.
5. The background worker calls the Search Console inspection endpoint.
6. The popup renders indexing results.

### Live test flow

1. Open the `Live Test` tab.
2. Click `Run Live Test`.
3. The popup sends `liveTest`.
4. The background worker calls the PageSpeed Insights API.
5. The popup renders Lighthouse and CrUX data.

### Search Console performance flow

1. Open the `Google Search Console` tab.
2. Choose date range and scope.
3. Click `Load Performance`.
4. The popup sends `perf`.
5. The background worker calls `searchAnalytics/query`.
6. The popup renders totals.

### GA4 analytics flow

1. Open the `Google Analytics` tab.
2. Properties are loaded from GA Admin API.
3. The extension attempts active-tab GA detection.
4. Select a property, date range, dimension, and metric.
5. Click `Load Analytics`.
6. The popup sends `gaReport`.
7. The background worker calls GA4 `runReport`.
8. The popup renders KPI cards, chart-like sparkline, and data table.

### On-page audit flow

1. Open the `On-Page` tab.
2. Click `Run On-Page Audit`.
3. The popup injects a script into the active page.
4. The page DOM is analyzed directly.
5. The popup renders the audit summary.

### PPC flow

1. Open the PPC tab.
2. Enter the GA4 property ID.
3. Select the date range.
4. Enter lead event names.
5. Click `Fetch Campaigns`.
6. The popup sends `ga.adsCampaigns`.
7. The background worker runs GA4 reports and merges them by campaign.
8. The popup renders the campaign table and enables CSV export.

## How to Use

### Use Search Console inspection

1. Open a page in Chrome.
2. Open the extension.
3. Select the matching Search Console property.
4. Confirm the URL.
5. Click `Inspect`.

### Open the same inspection inside Search Console

1. Select the property.
2. Confirm the URL.
3. Click `Open in GSC Inspect`.

### Run the live audit

1. Open `Live Test`.
2. Confirm the URL is public and covered by the selected property.
3. Click `Run Live Test`.
4. Review scores, metrics, field data, and opportunities.

### Load Search Console performance

1. Open `Google Search Console`.
2. Choose a date range.
3. Enable `Whole property` if required.
4. Click `Load Performance`.

### Load GA4 analytics

1. Open `Google Analytics`.
2. Pick the GA4 property.
3. Choose range, dimension, and metric.
4. Optionally enable `Compare prev`.
5. Click `Load Analytics`.
6. Export CSV if needed.

### Run the on-page audit

1. Open the target page.
2. Open `On-Page`.
3. Click `Run On-Page Audit`.
4. Review metadata, headings, links, images, and schema output.

### Use PPC reporting

1. Open the PPC panel.
2. Enter the GA4 property ID.
3. Set start and end dates.
4. Enter comma-separated lead events.
5. Click `Fetch Campaigns`.
6. Export CSV if needed.

## Internal Message Map

The popup communicates with the background worker using `chrome.runtime.sendMessage`.

Current message types in the code:

- `listSites`
- `inspect`
- `liveTest`
- `perf`
- `gaListProperties`
- `gaReport`
- `gaDetectFromTab`
- `ga.adsCampaigns`
- `getAccount`
- `logout`

Typical request cycle:

1. User clicks a popup action.
2. [popup.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/popup.js) sends a message.
3. [background.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/background.js) handles it.
4. The background worker authenticates if needed.
5. The relevant Google API is called.
6. Data is returned to the popup.
7. The popup renders cards and optional raw JSON.

## Permissions

The extension currently uses these Chrome permissions from [manifest.json](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/manifest.json):

- `identity`
- `storage`
- `activeTab`
- `scripting`

Host permissions include:

- Google account auth endpoints
- OAuth token endpoint
- Search Console APIs
- Google Analytics Admin API
- Google Analytics Data API

## Local Development

There is no build command. Local development is direct.

1. Edit the source files
2. Open `chrome://extensions/`
3. Click `Reload` for the extension
4. Re-open the popup and test the changed flow

Main files to work in:

- [background.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/background.js)
- [popup.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/popup.js)
- [popup.html](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/popup.html)
- [config.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/config.js)

## Limitations

- Chrome-focused extension architecture
- no automated tests in the current repository
- Search Console actions only work when the chosen property covers the URL
- live testing requires a publicly reachable URL
- Search Console performance is intentionally lagged to avoid fresh partial data
- GA4 detection depends on measurement IDs being discoverable on the page
- PPC reporting depends on GA4 and Google Ads linking

## Security Note

[config.js](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/config.js) contains OAuth credential fields directly in source. If this repository is going to be shared publicly, review and rotate credentials as needed before doing that.

## Version

Current extension version from [manifest.json](d:/Jayant/Extensions/New/Live Published Version/Marketer Comapnion Live Version/Marketer comapanion live version local/manifest.json):

- `0.3.1`

## Summary

Marketer Companion is a lightweight all-in-one extension for Search Console inspection, Search Console performance, GA4 reporting, on-page analysis, and basic PPC visibility through GA4. It is built as a plain Manifest V3 extension with direct Google API integration and no build pipeline.
