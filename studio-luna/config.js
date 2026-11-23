// Client config: the only file edited per business. Fictional demo client.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BUSINESS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    id: 'studio-luna',
    name: 'Studio Luna',
    initial: 'L',
    accent: '#00a884',
    currency: '$',
    defaultLang: 'en',
    openDays: [1, 2, 3, 4, 5, 6],
    slots: ['10:00', '12:30', '16:00'],
    hours: {
      en: 'We are open Monday to Saturday, 9:00 to 18:00. Closed on Sunday.',
      es: 'Atendemos de lunes a sábado, de 9:00 a 18:00. Domingo cerrado.',
    },
    address: {
      en: 'Studio Luna, 123 Example Street (fictional demo address).',
      es: 'Studio Luna, Calle Ejemplo 123 (dirección ficticia de demo).',
    },
    // Custom answers the business edits in the panel. First matching keyword wins.
    faqs: [
      { keywords: { en: ['parking', 'park'], es: ['estacionamiento', 'estacionar'] },
        answer: { en: 'There is free street parking in front of the studio.', es: 'Hay estacionamiento libre sobre la calle, frente al local.' } },
      { keywords: { en: ['pay', 'card', 'cash'], es: ['pagar', 'tarjeta', 'efectivo'] },
        answer: { en: 'We accept cash and cards.', es: 'Aceptamos efectivo y tarjetas.' } },
    ],
    services: [
      { id: 'cut', price: 25, min: 45, en: 'Haircut', es: 'Corte' },
      { id: 'color', price: 60, min: 120, en: 'Color', es: 'Color' },
      { id: 'nails', price: 20, min: 40, en: 'Manicure', es: 'Manicura' },
    ],
  };
});
