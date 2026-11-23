// Second fictional client: proves the same engine adapts to another business with only a config file.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BUSINESS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    id: 'clinica-sol',
    name: 'Clínica Dental Sol',
    initial: 'S',
    accent: '#2563eb',
    currency: '$',
    defaultLang: 'es',
    openDays: [1, 2, 3, 4, 5],
    slots: ['09:00', '11:00', '15:00', '17:30'],
    hours: {
      en: 'We are open Monday to Friday, 9:00 to 19:00. Closed on weekends.',
      es: 'Atendemos de lunes a viernes, de 9:00 a 19:00. Fines de semana cerrado.',
    },
    address: {
      en: 'Clínica Dental Sol, 456 Sample Avenue (fictional demo address).',
      es: 'Clínica Dental Sol, Av. Muestra 456 (dirección ficticia de demo).',
    },
    handoffNote: {
      en: 'For emergencies call the clinic directly. I am passing this chat to the reception team.',
      es: 'Ante una urgencia llamá directamente a la clínica. Paso este chat al equipo de recepción.',
    },
    services: [
      { id: 'check', price: 30, min: 30, en: 'Check-up', es: 'Consulta' },
      { id: 'clean', price: 50, min: 45, en: 'Cleaning', es: 'Limpieza' },
      { id: 'white', price: 140, min: 60, en: 'Whitening', es: 'Blanqueamiento' },
    ],
  };
});
