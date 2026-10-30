(function () {
  'use strict';

  const CC = {
    alkali:'#f87171',alkaline:'#fb923c',transition:'#fbbf24',
    post_transition:'#a3e635',metalloid:'#34d399',nonmetal:'#60a5fa',
    halogen:'#a78bfa',noble:'#f472b6',lanthanide:'#fcd34d',
    actinide:'#fda4af',unknown:'#9ca3af'
  };
  const CK = ['alkali','alkaline','transition','post_transition','metalloid','nonmetal','halogen','noble','lanthanide','actinide','unknown'];

  let t = function(k){ return k; };
  let ALL = [];

  function fail(msg) {
    console.error('[BAM v4]', msg);
    const g = document.getElementById('periodicGrid');
    if (g) g.innerHTML = '<div style="color:#f87171;padding:20px;border:2px solid #f87171;border-radius:8px;background:#1f2937;font-family:monospace;">⚠️ ' + msg + '</div>';
  }

  function boot() {
    console.log('[BAM v4] boot');

    // i18n optional, timeout 3s
    const i18nPromise = window.BAMi18n
      ? Promise.race([
          window.BAMi18n.init().then(function(){ t = window.BAMi18n.t; console.log('[BAM v4] i18n ok'); }),
          new Promise(function(r){ setTimeout(r, 3000); })
        ]).catch(function(e){ console.warn('[BAM v4] i18n fail (ignoring):', e); })
      : Promise.resolve();

    i18nPromise.then(function () {
      return fetch('data/elements.json?nocache=' + Date.now());
    }).then(function (r) {
      console.log('[BAM v4] fetch:', r.status);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      ALL = data;
      console.log('[BAM v4] elements:', ALL.length);
      render();
      console.log('[BAM v4] ✅ done');
    }).catch(function (err) {
      fail('Failed: ' + err.message);
    });
  }

  function render() {
    const grid = document.getElementById('periodicGrid');
    if (!grid) { fail('#periodicGrid missing'); return; }
    grid.innerHTML = '';

    let n = 0;
    ALL.filter(function(el){ return el.category !== 'lanthanide' && el.category !== 'actinide'; })
       .forEach(function(el){
         if (!el.group || !el.period) return;
         const c = card(el);
         c.style.gridColumn = el.group;
         c.style.gridRow = el.period;
         grid.appendChild(c);
         n++;
       });
    console.log('[BAM v4] main rendered:', n);

    const la = document.createElement('button');
    la.className = 'element-card f-block-jump';
    la.style.gridColumn = 3; la.style.gridRow = 6;
    la.style.setProperty('--cat-color', CC.lanthanide);
    la.innerHTML = '<span class="el-symbol" style="font-size:11px;">57-71</span>';
    la.addEventListener('click', function(){ jump('lanthanides'); });
    grid.appendChild(la);

    const ac = document.createElement('button');
    ac.className = 'element-card f-block-jump';
    ac.style.gridColumn = 3; ac.style.gridRow = 7;
    ac.style.setProperty('--cat-color', CC.actinide);
    ac.innerHTML = '<span class="el-symbol" style="font-size:11px;">89-103</span>';
    ac.addEventListener('click', function(){ jump('actinides'); });
    grid.appendChild(ac);

    const laGrid = document.getElementById('lanthanidesGrid');
    const acGrid = document.getElementById('actinidesGrid');
    if (laGrid) { laGrid.innerHTML = ''; ALL.filter(function(e){return e.category==='lanthanide';}).forEach(function(e){ laGrid.appendChild(card(e)); }); }
    if (acGrid) { acGrid.innerHTML = ''; ALL.filter(function(e){return e.category==='actinide';}).forEach(function(e){ acGrid.appendChild(card(e)); }); }

    renderLegend();
    attachSearch();
    attachFilters();
    attachModal();
  }

  function card(el) {
    const c = document.createElement('button');
    c.className = 'element-card';
    c.style.setProperty('--cat-color', CC[el.category] || CC.unknown);
    c.dataset.z = el.z;
    c.dataset.category = el.category;
    c.dataset.name = el.name.toLowerCase();
    c.dataset.symbol = el.symbol.toLowerCase();
    c.innerHTML = '<span class="el-z">' + el.z + '</span><span class="el-symbol">' + el.symbol + '</span><span class="el-name">' + el.name + '</span>';
    c.addEventListener('click', function(){ show(el); });
    return c;
  }

  function show(el) {
    const m = document.getElementById('elementModal');
    if (!m) return;
    document.getElementById('modalTitle').textContent = el.name + ' (' + el.symbol + ')';
    document.getElementById('modalBody').innerHTML =
      '<div class="detail-grid">' +
      '<div><span class="detail-label">' + t('element.atomic_number') + '</span><span class="detail-value">' + el.z + '</span></div>' +
      '<div><span class="detail-label">' + t('element.symbol') + '</span><span class="detail-value">' + el.symbol + '</span></div>' +
      '<div><span class="detail-label">' + t('element.mass') + '</span><span class="detail-value">' + el.mass + ' u</span></div>' +
      '<div><span class="detail-label">' + t('element.category') + '</span><span class="detail-value">' + t('categories.' + el.category) + '</span></div>' +
      '<div><span class="detail-label">' + t('element.group') + '</span><span class="detail-value">' + el.group + '</span></div>' +
      '<div><span class="detail-label">' + t('element.period') + '</span><span class="detail-value">' + el.period + '</span></div>' +
      '<div style="grid-column:1/-1;"><span class="detail-label">' + t('element.electron_config') + '</span><span class="detail-value">' + el.electron_config + '</span></div>' +
      '</div>';
    m.classList.add('modal-open');
  }

  function attachModal() {
    const m = document.getElementById('elementModal');
    if (!m) return;
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.classList.contains('modal-close')) m.classList.remove('modal-open');
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') m.classList.remove('modal-open'); });
  }

  function attachSearch() {
    const i = document.getElementById('searchInput');
    if (!i) return;
    i.addEventListener('input', function(){
      const q = i.value.toLowerCase().trim();
      document.querySelectorAll('.element-card[data-z]').forEach(function(c){
        if (!q) { c.classList.remove('dimmed'); return; }
        const ok = c.dataset.name.indexOf(q) > -1 || c.dataset.symbol.indexOf(q) > -1 || c.dataset.z === q;
        c.classList.toggle('dimmed', !ok);
      });
    });
  }

  function attachFilters() {
    document.querySelectorAll('.filter-pill').forEach(function(p){
      p.addEventListener('click', function(){
        document.querySelectorAll('.filter-pill').forEach(function(x){ x.classList.remove('active'); });
        p.classList.add('active');
        const f = p.dataset.filter;
        document.querySelectorAll('.element-card[data-z]').forEach(function(c){
          if (f === 'all') { c.classList.remove('dimmed'); return; }
          const cat = c.dataset.category;
          let s;
          if (f === 'metal') s = ['alkali','alkaline','transition','post_transition','lanthanide','actinide'].indexOf(cat) > -1;
          else if (f === 'nonmetal') s = ['nonmetal','halogen','metalloid'].indexOf(cat) > -1;
          else if (f === 'noble') s = cat === 'noble';
          else s = true;
          c.classList.toggle('dimmed', !s);
        });
      });
    });
  }

  function renderLegend() {
    const l = document.getElementById('legend');
    if (!l) return;
    l.innerHTML = CK.map(function(k){
      return '<div class="legend-item"><span class="legend-swatch" style="background:' + CC[k] + ';"></span><span>' + t('categories.' + k) + '</span></div>';
    }).join('');
  }

  function jump(block) {
    const id = block === 'lanthanides' ? 'lanthanidesGrid' : 'actinidesGrid';
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelectorAll('.element-card').forEach(function(c){
      c.classList.add('flash-highlight');
      setTimeout(function(){ c.classList.remove('flash-highlight'); }, 1600);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
