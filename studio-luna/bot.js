// Deterministic booking + lead-capture assistant. One engine, one config file per business.
// No network, no LLM, no API key: rules and a small state machine. Works in the browser and in Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StudioBot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DAYS = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  };

  // A client config must be complete before the bot is delivered; this is the delivery checklist.
  function validateConfig(b) {
    const errors = [];
    const need = (ok, msg) => { if (!ok) errors.push(msg); };
    need(b && typeof b.name === 'string' && b.name.length > 1, 'name is required');
    need(b && /^#[0-9a-f]{6}$/i.test(b.accent || ''), 'accent must be a #rrggbb colour');
    need(b && Array.isArray(b.openDays) && b.openDays.length > 0 && b.openDays.every(d => d >= 0 && d <= 6), 'openDays must list weekdays 0-6');
    need(b && Array.isArray(b.slots) && b.slots.length > 0 && b.slots.every(s => /^\d{2}:\d{2}$/.test(s)), 'slots must be HH:MM strings');
    need(b && Array.isArray(b.services) && b.services.length > 0, 'at least one service is required');
    ((b && b.services) || []).forEach((s, i) => {
      need(s.en && s.es, `service ${i + 1} needs en and es names`);
      need(Number.isFinite(s.price) && s.price >= 0, `service ${i + 1} needs a numeric price`);
      need(Number.isFinite(s.min) && s.min > 0, `service ${i + 1} needs minutes`);
    });
    ((b && b.faqs) || []).forEach((f, i) => {
      const words = [...((f.keywords && f.keywords.en) || []), ...((f.keywords && f.keywords.es) || [])].filter(Boolean);
      need(words.length > 0, `FAQ ${i + 1} needs at least one keyword`);
      need(f.answer && (f.answer.en || f.answer.es), `FAQ ${i + 1} needs an answer`);
    });
    for (const lang of ['en', 'es']) {
      need(b && b.hours && b.hours[lang], `hours.${lang} is required`);
      need(b && b.address && b.address[lang], `address.${lang} is required`);
    }
    return errors;
  }

  const T = {
    en: {
      hello: b => `Hi! I am the ${b.name} assistant. I can book an appointment, share prices and hours, or pass you to a person.`,
      menu: 'Reply with: *book*, *prices*, *hours*, *address* or *human*.',
      prices: b => 'Prices:\n' + b.services.map(x => `• ${x.en}: ${b.currency}${x.price} (${x.min} min)`).join('\n'),
      hours: b => b.hours.en,
      address: b => b.address.en,
      askService: b => 'Which service?\n' + b.services.map((x, i) => `${i + 1}. ${x.en} (${b.currency}${x.price})`).join('\n'),
      askDay: d => 'Which day?\n' + d.map((x, i) => `${i + 1}. ${x}`).join('\n'),
      askTime: t => 'Free times:\n' + t.map((x, i) => `${i + 1}. ${x}`).join('\n'),
      noTimes: 'That day is full. Please pick another day.',
      askName: 'What name should I put on the booking?',
      askPhone: 'And a phone number so we can confirm?',
      badPhone: 'That does not look like a phone number. Please send digits, for example +54 11 5555 1234.',
      booked: x => `Done, ${x.name}! ${x.service} on ${x.day} at ${x.time}. We will confirm by message. Reply *cancel* to cancel.`,
      cancelled: 'Booking cancelled. Anything else?',
      nothingToCancel: 'You have no booking in this chat.',
      handoff: b => b.handoffNote && b.handoffNote.en || 'I am passing this chat to a person. Someone will reply during opening hours.',
      miss: 'Sorry, I did not get that.',
      retry: 'I did not understand, please pick one of the options.',
      leadThanks: 'Thanks! We saved your contact and a person will write to you.',
    },
    es: {
      hello: b => `¡Hola! Soy el asistente de ${b.name}. Puedo reservar un turno, darte precios y horarios, o pasarte con una persona.`,
      menu: 'Respondé con: *turno*, *precios*, *horarios*, *dirección* o *persona*.',
      prices: b => 'Precios:\n' + b.services.map(x => `• ${x.es}: ${b.currency}${x.price} (${x.min} min)`).join('\n'),
      hours: b => b.hours.es,
      address: b => b.address.es,
      askService: b => '¿Qué servicio?\n' + b.services.map((x, i) => `${i + 1}. ${x.es} (${b.currency}${x.price})`).join('\n'),
      askDay: d => '¿Qué día?\n' + d.map((x, i) => `${i + 1}. ${x}`).join('\n'),
      askTime: t => 'Horarios libres:\n' + t.map((x, i) => `${i + 1}. ${x}`).join('\n'),
      noTimes: 'Ese día está completo. Elegí otro día.',
      askName: '¿A nombre de quién dejo el turno?',
      askPhone: '¿Y un teléfono para confirmarte?',
      badPhone: 'Eso no parece un teléfono. Mandame solo números, por ejemplo +54 11 5555 1234.',
      booked: x => `¡Listo, ${x.name}! ${x.service}, ${x.day} a las ${x.time}. Te confirmamos por mensaje. Escribí *cancelar* para cancelar.`,
      cancelled: 'Turno cancelado. ¿Algo más?',
      nothingToCancel: 'No tenés ningún turno en este chat.',
      handoff: b => b.handoffNote && b.handoffNote.es || 'Paso este chat a una persona. Te responderán en horario de atención.',
      miss: 'Perdón, no te entendí.',
      retry: 'No entendí, elegí una de las opciones.',
      leadThanks: '¡Gracias! Guardamos tu contacto y una persona te va a escribir.',
    },
  };

  const INTENTS = [
    ['handoff', /\b(human|person|agent|someone|persona|humano|asesor|operador)\b/i],
    ['cancel', /\b(cancel|cancelar|cancela|anular)\b/i],
    ['book', /\b(book|booking|appointment|reserve|turno|reservar|cita|agendar)\b/i],
    ['prices', /\b(price|prices|cost|how much|precio|precios|cu[aá]nto|tarifa)\b/i],
    ['hours', /\b(hours|open|opening|schedule|horario|horarios|abierto|abren)\b/i],
    ['address', /\b(address|where|location|direcci[oó]n|d[oó]nde|ubicaci[oó]n)\b/i],
    ['hello', /^(hi|hello|hey|hola|buenas|buen d[ií]a)\b/i],
  ];

  function detectLang(text) {
    return /\b(hola|turno|precios?|horarios?|persona|reservar|cu[aá]nto|buenas|gracias|cancelar|puede|pueden|pagar|tarjeta|quiero|quisiera|tienen|hay|estacionamiento|atienden|abren|efectivo|d[oó]nde)\b|[¿¡ñ]/i.test(text) ? 'es' : 'en';
  }

  // The same free slot list must come out for the same day, so "taken" slots come from the date.
  function freeSlots(date, slots) {
    const n = date.getDate() + date.getMonth();
    return slots.filter((_, i) => (n + i) % 4 !== 0);
  }

  function nextOpenDays(today, lang, count, openDays) {
    const out = [];
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    while (out.length < count) {
      d.setDate(d.getDate() + 1);
      if (!openDays.includes(d.getDay())) continue;
      out.push({ date: new Date(d), label: `${DAYS[lang][d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}` });
    }
    return out;
  }

  function pick(text, options, labelOf) {
    const n = parseInt(text.trim(), 10);
    if (n >= 1 && n <= options.length && /^\s*\d+\s*$/.test(text)) return options[n - 1];
    const t = text.toLowerCase();
    return options.find(o => t.includes(labelOf(o).toLowerCase())) || null;
  }

  function createBot(options) {
    const business = options && options.business;
    const errors = validateConfig(business);
    if (errors.length) throw new Error('Invalid business config: ' + errors.join('; '));
    const today = options.today || new Date();
    const fixedLang = options.lang || null;
    let lang = fixedLang || business.defaultLang || 'en';
    let step = null;
    let draft = {};
    let booking = null;
    let misses = 0;
    let greeted = false;
    const events = [];

    // Quick-reply buttons for the current step; null means "use the default menu".
    function choices() {
      if (step === 'service') return business.services.map(s => s[lang]);
      if (step === 'day') return draft.days.map(d => d.label);
      if (step === 'time') return draft.times.slice();
      return null;
    }

    function say(replies, extra) {
      return Object.assign({ replies, events: events.splice(0), choices: choices() }, extra || {});
    }

    function startBooking() {
      step = 'service';
      draft = {};
      return say([T[lang].askService(business)]);
    }

    function handle(text) {
      text = String(text || '').trim();
      if (!text) return say([]);
      if (!fixedLang && (!greeted || detectLang(text) === 'es')) lang = detectLang(text);
      const t = T[lang];
      const first = !greeted;
      greeted = true;
      const intent = (INTENTS.find(([, re]) => re.test(text)) || [])[0];
      const handoff = () => { step = null; events.push({ type: 'handoff' }); return t.handoff(business); };

      if (intent === 'handoff') return say([handoff()], { handoff: true });
      if (intent === 'cancel') {
        if (!booking) return say([t.nothingToCancel]);
        events.push({ type: 'cancelled', booking });
        booking = null;
        step = null;
        return say([t.cancelled]);
      }
      if (step === null || intent === 'book') {
        if (intent === 'book') return startBooking();
        if (intent === 'prices') return say([t.prices(business)]);
        if (intent === 'hours') return say([t.hours(business)]);
        if (intent === 'address') return say([t.address(business)]);
        const lower = text.toLowerCase();
        const faq = (business.faqs || []).find(f => [...(f.keywords.en || []), ...(f.keywords.es || [])].some(k => k && lower.includes(k.toLowerCase())));
        if (faq) { misses = 0; return say([faq.answer[lang] || faq.answer.en || faq.answer.es]); }
        if (intent === 'hello' || first) { misses = 0; return say([t.hello(business), t.menu]); }
        misses += 1;
        if (misses >= 2) return say([t.miss, handoff()], { handoff: true });
        return say([t.miss, t.menu]);
      }

      if (step === 'service') {
        const s = pick(text, business.services, x => x[lang]);
        if (!s) return say([t.retry, t.askService(business)]);
        draft.service = s[lang];
        draft.price = s.price;
        step = 'day';
        draft.days = nextOpenDays(today, lang, 3, business.openDays);
        return say([t.askDay(draft.days.map(x => x.label))]);
      }
      if (step === 'day') {
        const d = pick(text, draft.days, x => x.label);
        if (!d) return say([t.retry, t.askDay(draft.days.map(x => x.label))]);
        const times = freeSlots(d.date, business.slots);
        if (!times.length) return say([t.noTimes, t.askDay(draft.days.map(x => x.label))]);
        draft.day = d.label;
        draft.times = times;
        step = 'time';
        return say([t.askTime(times)]);
      }
      if (step === 'time') {
        const tm = pick(text, draft.times, x => x);
        if (!tm) return say([t.retry, t.askTime(draft.times)]);
        draft.time = tm;
        step = 'name';
        return say([t.askName]);
      }
      if (step === 'name') {
        if (text.length < 2 || text.length > 60 || /\d{5,}/.test(text)) return say([t.askName]);
        draft.name = text;
        step = 'phone';
        return say([t.askPhone]);
      }
      if (step === 'phone') {
        const digits = text.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 15 || /[a-z]/i.test(text)) return say([t.badPhone]);
        booking = { name: draft.name, service: draft.service, price: draft.price, day: draft.day, time: draft.time, phone: text };
        events.push({ type: 'booking', booking }, { type: 'lead', lead: { name: draft.name, phone: text, source: business.id } });
        step = null;
        return say([t.booked(booking), t.leadThanks]);
      }
      return say([t.menu]);
    }

    return { handle, state: () => ({ step, booking, lang }) };
  }

  return { createBot, validateConfig };
});
