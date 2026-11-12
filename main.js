/* Orbit Advance — site scripts */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const EMAIL = 'admin@orbitadvance.com';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => '$' + Math.round(n).toLocaleString('en-US');

  /* Build a mailto: link with a subject and a pre-filled body */
  const mailto = (subject, lines) =>
    `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
  // "Term loan" -> "a term loan", "SBA loan" -> "an SBA loan"
  const phrase = p => /^SBA/i.test(p) ? `an SBA ${p.slice(4).toLowerCase()}` : `a ${p.toLowerCase()}`;
  const details = [
    'Business name: ',
    'Industry: ',
    'Time in business: ',
    'Average monthly revenue: '
  ];
  const template = program => [
    'Hi Orbit Advance,', '',
    program ? `I'd like to ask about ${phrase(program)} for my business.` : "I'd like to look at funding options for my business.", '',
    ...details,
    'Amount needed: ',
    'When I need it: ',
    'What it\'s for: ',
    'Best phone number: ', '',
    'Thank you'
  ];

  /* Email buttons: data-mail="" for a general inquiry, data-mail="Term loan" for one program */
  $$('[data-mail]').forEach(a => {
    const program = a.getAttribute('data-mail');
    a.href = mailto(program ? `${program} inquiry` : 'Funding inquiry', template(program));
  });

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* Mobile menu */
  const menuBtn = $('.menu-btn');
  const nav = $('#nav');
  const header = $('.header');
  if (menuBtn && nav && header) {
    const setOpen = open => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };
    const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.addEventListener('click', e => {
      const open = !isOpen();
      setOpen(open);
      // Opened from the keyboard: the links sit before the button in the page, so move focus into them
      if (open && e.detail === 0) { const first = nav.querySelector('a'); if (first) first.focus(); }
    });
    // Any link in the header closes the menu, and so does a click outside it
    header.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', e => { if (isOpen() && !e.target.closest('.header')) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { setOpen(false); menuBtn.focus(); } });
  }

  /* Header gets a class once the page is scrolled */
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- Funding planner ----------------
     Compares an amount and a deadline with each program's typical range.
     Times are in calendar days: `fast` is the quick end of the range, `slow` the long end. */
  const amountInput = $('#planAmount');
  const whenGroup = $('#planWhen');
  if (amountInput && whenGroup) {
    const AMOUNTS = [10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 100000, 125000, 150000, 200000,
      250000, 300000, 400000, 500000, 600000, 750000, 1000000, 1250000, 1500000, 2000000, 2500000, 3000000];
    const PROGRAMS = [
      { id: 'mca',  name: 'Merchant cash advance', min: 10000, max: 3000000, fast: 1,  slow: 2,  takes: '24–48 hours' },
      { id: 'loc',  name: 'Line of credit',        min: 10000, max: 1000000, fast: 1,  slow: 3,  takes: '1–3 days to approve' },
      { id: 'term', name: 'Term loan',             min: 25000, max: 3000000, fast: 2,  slow: 7,  takes: '2–5 business days' },
      { id: 'sba',  name: 'SBA loan',              min: 50000, max: 3000000, fast: 30, slow: 90, takes: '30–90 days' }
    ];
    const WINDOWS = {
      '2d':      { days: 2,  label: 'Within 48 hours', phrase: 'within 48 hours' },
      'week':    { days: 7,  label: 'This week',       phrase: 'this week' },
      'month':   { days: 30, label: 'This month',      phrase: 'this month' },
      'quarter': { days: 90, label: 'In 2–3 months',   phrase: 'in 2–3 months' }
    };

    const amountOut = $('#planAmountOut');
    const summary = $('#planSummary');
    const cta = $('#planCta');
    const chips = $$('.chip[data-window]', whenGroup);

    // Returns { state: 'in' | 'tight' | 'out', text } for one program
    const check = (p, amount, win) => {
      if (amount < p.min) return { state: 'out', text: `Starts at ${money(p.min)}` };
      if (amount > p.max) return { state: 'out', text: `Goes up to ${money(p.max)}` };
      if (win.days < p.fast) return { state: 'out', text: `Typically takes ${p.takes}` };
      if (win.days < p.slow) return { state: 'tight', text: `Possible, but tight (${p.takes})` };
      return { state: 'in', text: 'In range' };
    };

    const tool = $('#plannerTool');
    const selectedWindow = () => {
      const on = chips.find(c => c.getAttribute('aria-pressed') === 'true') || chips[0];
      const key = WINDOWS[on.dataset.window] ? on.dataset.window : 'week';
      // The stylesheet reads this to place the "your deadline" line on the time bars
      if (tool) tool.setAttribute('data-window', key);
      return WINDOWS[key];
    };

    const update = () => {
      const amount = AMOUNTS[Math.max(0, Math.min(AMOUNTS.length - 1, Number(amountInput.value) || 0))];
      const win = selectedWindow();
      const amountText = money(amount);
      amountInput.setAttribute('aria-valuetext', amountText);
      if (amountOut) amountOut.textContent = amountText;
      // Position of the slider as 0..1, used by the stylesheet to fill the track up to the thumb
      amountInput.style.setProperty('--pn', String((Number(amountInput.value) || 0) / (AMOUNTS.length - 1)));

      const results = PROGRAMS.map(p => ({ p, ...check(p, amount, win) }));
      // Every element marked data-program="mca|loc|term|sba" gets the state; a [data-status] inside it gets the wording
      results.forEach(({ p, state, text }) => {
        $$(`[data-program="${p.id}"]`).forEach(el => {
          el.setAttribute('data-state', state);
          $$('[data-status]', el).forEach(s => { s.textContent = text; });
        });
      });

      const inRange = results.filter(r => r.state === 'in').map(r => r.p.name);
      const tight = results.filter(r => r.state === 'tight').map(r => r.p.name);
      if (summary) {
        const count = `${inRange.length} of ${PROGRAMS.length} program${PROGRAMS.length === 1 ? '' : 's'}`;
        const extra = tight.length ? ` ${tight.length === 1 ? 'One more is' : `${tight.length} more are`} possible, but tight.` : '';
        summary.innerHTML = `<strong>${count}</strong> can do ${amountText} ${win.phrase}.${extra}`;
      }
      if (cta) {
        cta.href = mailto(`Funding plan: ${amountText}, ${win.phrase}`, [
          'Hi Orbit Advance,', '',
          'I used the funding planner on your website.', '',
          `Amount needed: ${amountText}`,
          `When I need it: ${win.label}`,
          `Programs in range: ${inRange.join(', ') || 'none'}`,
          ...(tight.length ? [`Possible, but tight: ${tight.join(', ')}`] : []), '',
          ...details,
          'What it\'s for: ',
          'Best phone number: ', '',
          'Thank you'
        ]);
      }
    };

    amountInput.addEventListener('input', update);
    amountInput.addEventListener('change', update);
    whenGroup.addEventListener('click', e => {
      const chip = e.target.closest('.chip[data-window]');
      if (!chip) return;
      chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      update();
    });
    update();
  }
})();
