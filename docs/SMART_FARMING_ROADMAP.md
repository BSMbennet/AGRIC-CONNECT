# AgricNorthX — Smart Farming and Commercial Roadmap

## Product decision

Keep the existing Next.js, Supabase and Vercel platform. AgricNorthX is the product brand; the GitHub repository slug remains `AGRIC-CONNECT` to avoid breaking repository integrations. The core product remains the farmer-to-buyer and cooperative fulfilment workflow.

The source concept proposes GIS crop suitability, irrigation planning, yield estimates, indigenous knowledge, local input suppliers, language inclusion and subscriptions. These should be introduced only when data, governance and customer demand support them.

## Implemented product layers

### Marketplace and cooperative workflow

- Farmer/agent onboarding, produce listings, buyer requests and order/stock workflows are the product's core.
- Offline-first capture supports low-connectivity access; unsynced drafts are not buyer-visible.
- Cooperative aggregation must respect member opt-in and explicit farmer allocations.

### Market Insights — `/market-insights`

- Aggregates active listing supply and farmer asking-price ranges.
- Separates unlike quantity and price units.
- Does not claim verified transaction prices, market-wide prices or buyer demand.

### Farm Weather Planner — `/weather`

- Farmer searches for a South African locality and selects a match; the app does not silently access device GPS.
- Seven-day outlook includes min/max air temperature, forecast precipitation, precipitation probability and FAO reference evapotranspiration (ET₀).
- Weather values are area/grid forecasts, not field sensor readings.
- The UI provides a field-check reminder, not crop-specific irrigation instructions.

### Pricing guide — `/pricing`

- Compares farmer-entered unit costs and target margin with similar active AgricNorthX asking prices.
- It is a decision aid, not a wholesale benchmark or guaranteed sale price.

### Community knowledge — `/knowledge`

- Public entries are shown only when published with public sharing scope.
- Indigenous knowledge requires informed consent, attribution, contributor control, access restrictions and community governance.
- Do not train AI on contributed knowledge without separate permission.

## What remains staged

| Capability | Next decision gate |
|---|---|
| Crop suitability / GIS | Obtain authoritative soil, elevation and land-cover datasets; document resolution/licence/date; validate crop requirements with local agronomists. |
| Irrigation recommendations | Add plot-level soil moisture, soil type, crop, growth stage and locally validated crop coefficients. Weather alone is insufficient. |
| Yield prediction | Collect locally calibrated crop, planting, cultivar and management data; report uncertainty and avoid guaranteed yield claims. |
| Fertilizer suppliers | Verify suppliers, stock freshness, product details and pricing; disclose referral fees and never pay-rank agronomic advice. |
| Tshivenda, Xitsonga, Sepedi | Complete a fluent-speaker-reviewed end-to-end journey; keep unreviewed translations clearly marked. |
| Buyer/cooperative subscriptions | Validate repeat usage and willingness to pay before launching paid tiers. |
| Indigenous knowledge monetisation | Require community-approved permissions, benefit sharing and legal review; no public commercialisation by default. |

## Commercial model

Keep farmer registration, listing and buyer discovery free during the pilot. Test revenue on the organisation/buyer side:

1. Buyer Pro: bulk sourcing, saved suppliers, procurement exports and availability alerts.
2. Cooperative/institution subscription: member coordination, fulfilment dashboards and reports.
3. Transparent completed-order fee: only on successfully fulfilled transactions, with explicit agreement.
4. Disclosed supplier referrals and logistics coordination.
5. Sponsored training and community-reviewed knowledge programmes.

Do not launch all streams at once. Prove repeat buying, successful fulfilment and measurable savings first. No revenue or farmer outcome is claimed until measured.

Illustration only: R100,000 completed monthly sales × 5% disclosed fee = R5,000 gross before operating costs. This is a scenario, not a forecast.

## Judge demonstration

1. Agent registers a farmer with consent.
2. Farmer listing is created and, where possible, captured offline then synced.
3. Buyer requests a quantity.
4. Farmer accepts and stock is reserved.
5. Cooperative combines two farmers' opted-in supply.
6. Market Insights shows real demo listings and clearly labels asking prices.
7. Farm Planner shows a selected Vhembe locality's seven-day forecast.
8. Close with free farmer access and buyer/cooperative-side monetisation.

Use synthetic accounts/data in public demos. Never invent farmer numbers, testimonials, buyer commitments, revenue or impact.

## Weather provider terms

The current prototype uses the Open-Meteo Geocoding and Forecast APIs:

- https://open-meteo.com/en/docs/geocoding-api
- https://open-meteo.com/en/docs

The free API is for non-commercial use. Before AgricNorthX uses weather data in a revenue-generating service, obtain the appropriate commercial licence or switch to a suitably licensed provider. Weather data attribution is displayed in the planner (CC BY 4.0).

## Known limitations

- Weather data is a locality/grid forecast; no field soil-moisture sensor, infiltration measurement, soil map or crop-water model is connected.
- Market insights reflects AgricNorthX listings only, not all local markets.
- Asking prices are not completed sale prices.
- No subscriptions, payment collection, supplier marketplace or transaction fee is implemented by this change.
- GIS suitability and yield prediction are not implemented.
- Community knowledge must not be collected or commercialised without informed consent and community governance.
