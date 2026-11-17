# AgricNorthX — Smart Farming and Commercial Roadmap

## Product decision

Keep the existing Next.js, Supabase and Vercel platform. AgricNorthX is the product brand; the GitHub repository slug remains `AGRIC-CONNECT` to avoid breaking repository integrations. The core product remains the farmer-to-buyer and cooperative fulfilment workflow.

The Venda Smart Farming concept is being added as a layer of trustworthy, locally grounded decision support, not as a replacement product.

## Implemented product layers

### Marketplace and cooperative workflow

- Farmer/agent onboarding, produce listings, buyer requests and stock/order workflows.
- Offline-first capture supports low-connectivity settings; unsynced drafts are not buyer-visible.
- Cooperative aggregation respects member opt-in and explicit farmer allocations.

### Market Insights — `/market-insights`

- Aggregates active listing supply and farmer asking-price ranges.
- Separates unlike quantity and price units.
- Does not claim verified transaction prices, market-wide prices or buyer demand.

### Farm Weather Planner — `/weather`

- Farmer searches for a South African locality and selects a match; the app does not silently access device GPS.
- Seven-day outlook includes min/max air temperature, forecast precipitation, precipitation probability and FAO reference evapotranspiration (ET₀).
- Weather values are area/grid forecasts, not field sensor readings.
- The UI provides a field-check reminder, not crop-specific irrigation instructions.

### Field Truth — `/fields`

- Farmers can record multiple private field profiles using a name and locality.
- Soil texture and drainage are recorded as farmer observations; soil pH records distinguish laboratory tests, farmer estimates and no test.
- Exact GPS coordinates are not collected. Field profiles are private to their owner under row-level security.
- These records are evidence inputs for future recommendations, not proof of soil conditions.
- Crop scores and yield estimates are intentionally not generated until crop requirements and local datasets have been validated.

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
| GIS crop suitability | Obtain authoritative soil, elevation and land-cover datasets; document resolution/licence/date; validate crop requirements with local agronomists. |
| Irrigation recommendations | Add plot-level soil moisture, soil type, crop, growth stage and locally validated crop coefficients. Weather alone is insufficient. |
| Yield prediction | Collect locally calibrated crop, planting, cultivar and management data; report uncertainty and avoid guaranteed yield claims. |
| Fertilizer suppliers | Verify suppliers, stock freshness, product details and pricing; disclose referral fees and never pay-rank agronomic advice. |
| Tshivenda, Xitsonga, Sepedi, Afrikaans | Complete a fluent-speaker-reviewed end-to-end journey; keep unreviewed translations clearly marked. |
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

## Judge demonstration

1. Agent registers a farmer with consent.
2. Farmer creates a private Field Truth profile, distinguishing observed soil conditions from lab-tested pH.
3. AgricNorthX shows the selected Vhembe locality's seven-day forecast.
4. The demo explicitly explains that crop suitability awaits locally validated crop rules and soil layers; no fabricated yield estimate is shown.
5. An elder contributes a traditional water-management practice under community-controlled permissions.
6. Farmer lists produce and a buyer requests supply.
7. Cooperative aggregates member supply.
8. Market Insights shows real demo listings and clearly labels asking prices.
9. Close with free farmer access and buyer/cooperative-side monetisation.

Use synthetic accounts/data in public demos. Never invent farmer numbers, testimonials, buyer commitments, revenue or impact.

## Weather provider terms

The current prototype uses the Open-Meteo Geocoding and Forecast APIs:

- https://open-meteo.com/en/docs/geocoding-api
- https://open-meteo.com/en/docs

The free API is for non-commercial use. Before AgricNorthX uses weather data in a revenue-generating service, obtain the appropriate commercial licence or switch to a suitably licensed provider. Weather data attribution is displayed in the planner (CC BY 4.0).

## Known limitations

- Field Truth records farmer-entered observations; it is not a soil survey or laboratory service.
- Weather data is a locality/grid forecast; no field soil-moisture sensor, infiltration measurement, soil map or crop-water model is connected.
- Market insights reflects AgricNorthX listings only, not all local markets.
- Asking prices are not completed sale prices.
- GIS suitability and yield prediction are not implemented.
- Community knowledge must not be collected or commercialised without informed consent and community governance.
