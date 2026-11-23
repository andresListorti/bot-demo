# Booking and lead assistant (white-label demo)

One engine, one config file per business. Simulated WhatsApp-style chat; no network, no AI model, no API key.
Answers come from fixed rules, so the assistant cannot invent prices or hours.

## Files
- `bot.js`: the engine (EN/ES): bookings, prices/hours/address, custom FAQ answers, lead capture, handoff to a person, config validation.
- `index.html`: mobile-first chat (Chat / Business tabs on phones, light/dark toggle).
- `admin.html`: the client's settings panel (hours, services and prices, open days, times, custom answers) with live preview.
- `clients/<client>.js`: the business config. Two fictional examples: `studio-luna.js`, `clinica-sol.js`.
- `make-client.mjs`: validates a config and builds `dist/<client>/`, ready for any static host.
- `test.mjs`: `node test.mjs` (logic, config validation, FAQ, second client).

## Deliver an adaptation to a new business
1. Copy `clients/studio-luna.js` to `clients/<new-client>.js`; fill in name, colour, hours, services, FAQ.
2. `node make-client.mjs clients/<new-client>.js` (refuses an incomplete config and says what is missing).
3. Upload `dist/<new-client>/` to the client's host. The client edits answers in `admin.html`.

## Limits to tell the client
- The settings panel saves in the browser of whoever uses it. To publish changes, the client downloads the new
  `config.js` and sends it to you (or replaces it). A hosted panel with accounts is a separate paid add-on.
- This is the simulator. Connecting to the real WhatsApp Business API, a calendar and a CRM is the paid integration
  step (Meta fees and a business number are the client's).
- Demo businesses and addresses are fictional.
