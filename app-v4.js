(function () {
  'use strict';

  var CC = {
    alkali:'#f87171',alkaline:'#fb923c',transition:'#fbbf24',
    post_transition:'#a3e635',metalloid:'#34d399',nonmetal:'#60a5fa',
    halogen:'#a78bfa',noble:'#f472b6',lanthanide:'#fcd34d',
    actinide:'#fda4af',unknown:'#9ca3af'
  };
  var CK = ['alkali','alkaline','transition','post_transition','metalloid','nonmetal','halogen','noble','lanthanide','actinide','unknown'];

  var EN = {
    'element.atomic_number': 'Atomic Number',
    'element.symbol': 'Symbol',
    'element.mass': 'Atomic Mass',
    'element.category': 'Category',
    'element.group': 'Group',
    'element.period': 'Period',
    'element.electron_config': 'Electron Configuration',
    'element.unit_u': 'u',
    'categories.alkali': 'Alkali Metal',
    'categories.alkaline': 'Alkaline Earth',
    'categories.transition': 'Transition Metal',
    'categories.post_transition': 'Post-Transition',
    'categories.metalloid': 'Metalloid',
    'categories.nonmetal': 'Non-metal',
    'categories.halogen': 'Halogen',
    'categories.noble': 'Noble Gas',
    'categories.lanthanide': 'Lanthanide',
    'categories.actinide': 'Actinide',
    'categories.unknown': 'Unknown'
  };

  function t(k) { return EN[k] || k; }

  var ALL = [];

  function fail(msg) {
    console.error('[BAM]', msg);
    var g = document.getElementById('periodicGrid');
    if (g) g.innerHTML = '<div style="color:#f87171;padding:20px;border:2px solid #f87171;border-radius:8px;background:#1f2937;font-family:monospace;">⚠️ ' + msg + '</div>';
  }

  function boot() {
    console.log('[BAM] boot');
    fetch('data/elements.json?nocache=' + Date.now())
      .then(function (r) {
        console.log('[BAM] fetch:', r.status);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        ALL = data;
        console.log('[BAM] elements:', ALL.length);
        render();
        console.log('[BAM] ✅ done');
      })
      .catch(function (err) { fail('Failed: ' + err.message); });
  }

  function render() {
    var grid = document.getElementById('periodicGrid');
    if (!grid) { fail('#periodicGrid missing'); return; }
    grid.innerHTML = '';

    var n = 0;
    ALL.filter(function(el){ return el.category !== 'lanthanide' && el.category !== 'actinide'; })
       .forEach(function(el){
         if (!el.group || !el.period) return;
         var c = card(el);
         c.style.gridColumn = el.group;
         c.style.gridRow = el.period;
         grid.appendChild(c);
         n++;
       });
    console.log('[BAM] main rendered:', n);

    var la = document.createElement('button');
    la.className = 'element-card f-block-jump';
    la.style.gridColumn = 3; la.style.gridRow = 6;
    la.style.setProperty('--cat-color', CC.lanthanide);
    la.innerHTML = '<span class="el-symbol" style="font-size:11px;">57-71</span>';
    la.addEventListener('click', function(){ jump('lanthanides'); });
    grid.appendChild(la);

    var ac = document.createElement('button');
    ac.className = 'element-card f-block-jump';
    ac.style.gridColumn = 3; ac.style.gridRow = 7;
    ac.style.setProperty('--cat-color', CC.actinide);
    ac.innerHTML = '<span class="el-symbol" style="font-size:11px;">89-103</span>';
    ac.addEventListener('click', function(){ jump('actinides'); });
    grid.appendChild(ac);

    var laGrid = document.getElementById('lanthanidesGrid');
    var acGrid = document.getElementById('actinidesGrid');
    if (laGrid) { laGrid.innerHTML = ''; ALL.filter(function(e){return e.category==='lanthanide';}).forEach(function(e){ laGrid.appendChild(card(e)); }); }
    if (acGrid) { acGrid.innerHTML = ''; ALL.filter(function(e){return e.category==='actinide';}).forEach(function(e){ acGrid.appendChild(card(e)); }); }

    renderLegend();
    attachSearch();
    attachFilters();
    attachModal();
  }

  function card(el) {
    var c = document.createElement('button');
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
    var m = document.getElementById('elementModal');
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
    var m = document.getElementById('elementModal');
    if (!m) return;
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.classList.contains('modal-close')) m.classList.remove('modal-open');
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') m.classList.remove('modal-open'); });
  }

  function attachSearch() {
    var i = document.getElementById('searchInput');
    if (!i) return;
    i.addEventListener('input', function(){
      var q = i.value.toLowerCase().trim();
      document.querySelectorAll('.element-card[data-z]').forEach(function(c){
        if (!q) { c.classList.remove('dimmed'); return; }
        var ok = c.dataset.name.indexOf(q) > -1 || c.dataset.symbol.indexOf(q) > -1 || c.dataset.z === q;
        c.classList.toggle('dimmed', !ok);
      });
    });
  }

  function attachFilters() {
    document.querySelectorAll('.filter-pill').forEach(function(p){
      p.addEventListener('click', function(){
        document.querySelectorAll('.filter-pill').forEach(function(x){ x.classList.remove('active'); });
        p.classList.add('active');
        var f = p.dataset.filter;
        document.querySelectorAll('.element-card[data-z]').forEach(function(c){
          if (f === 'all') { c.classList.remove('dimmed'); return; }
          var cat = c.dataset.category;
          var s;
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
    var l = document.getElementById('legend');
    if (!l) return;
    l.innerHTML = CK.map(function(k){
      return '<div class="legend-item"><span class="legend-swatch" style="background:' + CC[k] + ';"></span><span>' + t('categories.' + k) + '</span></div>';
    }).join('');
  }

  function jump(block) {
    var id = block === 'lanthanides' ? 'lanthanidesGrid' : 'actinidesGrid';
    var el = document.getElementById(id);
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
