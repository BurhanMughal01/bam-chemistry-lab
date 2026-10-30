(function () {
  'use strict';

  var CATEGORY_COLORS = {
    'combustion': '#f87171',
    'synthesis': '#34d399',
    'decomposition': '#fbbf24',
    'acid-base': '#60a5fa',
    'precipitation': '#a78bfa',
    'displacement': '#f472b6'
  };

  var EN = {
    'reactions.all': 'All',
    'reactions.showing': 'Showing',
    'reactions.reactions': 'reactions',
    'reactions.delta_h': 'ΔH',
    'reactions.hazard': 'Hazard',
    'difficulty.basic': 'Basic',
    'difficulty.intermediate': 'Intermediate',
    'difficulty.advanced': 'Advanced',
    'reaction_categories.combustion': 'Combustion',
    'reaction_categories.synthesis': 'Synthesis',
    'reaction_categories.decomposition': 'Decomposition',
    'reaction_categories.acid-base': 'Acid-Base',
    'reaction_categories.precipitation': 'Precipitation',
    'reaction_categories.displacement': 'Displacement'
  };

  function t(k) { return EN[k] || k; }

  var CATEGORIES = ['combustion', 'synthesis', 'decomposition', 'acid-base', 'precipitation', 'displacement'];
  var DIFFICULTIES = ['basic', 'intermediate', 'advanced'];

  var ALL_REACTIONS = [];
  var filterCategory = 'all';
  var filterDifficulty = 'all';
  var filterSearch = '';

  function boot() {
    console.log('[Reactions] boot');
    fetch('data/reactions.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        ALL_REACTIONS = data;
        console.log('[Reactions] loaded:', ALL_REACTIONS.length);
        var statTotal = document.getElementById('statTotal');
        if (statTotal) statTotal.textContent = ALL_REACTIONS.length;
        renderCategoryPills();
        renderDifficultyPills();
        attachSearch();
        renderReactions();
        console.log('[Reactions] done');
      })
      .catch(function (err) {
        console.error('[Reactions] error:', err);
        var grid = document.getElementById('reactionsGrid');
        if (grid) grid.innerHTML = '<div style="color:#f87171;padding:20px;grid-column:1/-1;text-align:center;">Failed to load: ' + err.message + '</div>';
      });
  }

  function renderCategoryPills() {
    var wrap = document.getElementById('categoryPills');
    if (!wrap) return;
    var allBtn = document.createElement('button');
    allBtn.className = 'category-pill active';
    allBtn.dataset.cat = 'all';
    allBtn.textContent = 'All (' + ALL_REACTIONS.length + ')';
    allBtn.addEventListener('click', function () { setCategory('all'); });
    wrap.appendChild(allBtn);

    CATEGORIES.forEach(function (cat) {
      var count = ALL_REACTIONS.filter(function (r) { return r.category === cat; }).length;
      var btn = document.createElement('button');
      btn.className = 'category-pill';
      btn.dataset.cat = cat;
      btn.textContent = t('reaction_categories.' + cat) + ' (' + count + ')';
      btn.addEventListener('click', function () { setCategory(cat); });
      wrap.appendChild(btn);
    });
  }

  function renderDifficultyPills() {
    var wrap = document.getElementById('difficultyPills');
    if (!wrap) return;
    var allBtn = document.createElement('button');
    allBtn.className = 'difficulty-pill active';
    allBtn.dataset.diff = 'all';
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', function () { setDifficulty('all'); });
    wrap.appendChild(allBtn);

    DIFFICULTIES.forEach(function (d) {
      var btn = document.createElement('button');
      btn.className = 'difficulty-pill';
      btn.dataset.diff = d;
      btn.textContent = t('difficulty.' + d);
      btn.addEventListener('click', function () { setDifficulty(d); });
      wrap.appendChild(btn);
    });
  }

  function setCategory(cat) {
    filterCategory = cat;
    document.querySelectorAll('.category-pill').forEach(function (b) {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    renderReactions();
  }

  function setDifficulty(diff) {
    filterDifficulty = diff;
    document.querySelectorAll('.difficulty-pill').forEach(function (b) {
      b.classList.toggle('active', b.dataset.diff === diff);
    });
    renderReactions();
  }

  function attachSearch() {
    var input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', function () {
      filterSearch = input.value.toLowerCase().trim();
      renderReactions();
    });
  }

  function filterList() {
    return ALL_REACTIONS.filter(function (r) {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (filterDifficulty !== 'all' && r.difficulty !== filterDifficulty) return false;
      if (filterSearch) {
        var hay = (r.equation + ' ' + r.id + ' ' +
          r.reactants.map(function (x) { return x.name + ' ' + x.formula; }).join(' ') + ' ' +
          r.products.map(function (x) { return x.name + ' ' + x.formula; }).join(' ') + ' ' +
          (r.description || '')).toLowerCase();
        if (hay.indexOf(filterSearch) === -1) return false;
      }
      return true;
    });
  }

  function renderReactions() {
    var grid = document.getElementById('reactionsGrid');
    var noResults = document.getElementById('noResults');
    var countEl = document.getElementById('reactionsCount');
    if (!grid) return;

    var filtered = filterList();
    grid.innerHTML = '';

    if (filtered.length === 0) {
      if (noResults) noResults.style.display = 'block';
      if (countEl) countEl.textContent = '';
      return;
    }
    if (noResults) noResults.style.display = 'none';

    filtered.forEach(function (r) { grid.appendChild(createCard(r)); });

    if (countEl) {
      countEl.innerHTML = 'Showing <strong>' + filtered.length + '</strong> / ' + ALL_REACTIONS.length + ' reactions';
    }
  }

  function createCard(r) {
    var card = document.createElement('div');
    card.className = 'reaction-card';
    card.style.setProperty('--reaction-color', CATEGORY_COLORS[r.category] || '#059669');

    var deltaText = (r.delta_h > 0 ? '+' : '') + r.delta_h + ' kJ/mol';
    var deltaColor = r.delta_h < 0 ? '#34d399' : '#f87171';
    var hazardHtml = r.hazard ? '<div class="reaction-hazard">⚠️ ' + escapeHtml(r.hazard) + '</div>' : '';

    card.innerHTML =
      '<div class="reaction-card-header">' +
        '<span class="reaction-category-badge">' + t('reaction_categories.' + r.category) + '</span>' +
        '<span class="reaction-difficulty-badge difficulty-' + r.difficulty + '">' + t('difficulty.' + r.difficulty) + '</span>' +
      '</div>' +
      '<div class="reaction-equation">' + escapeHtml(r.equation) + '</div>' +
      '<div class="reaction-description">' + escapeHtml(r.description) + '</div>' +
      '<div class="reaction-meta">' +
        '<span class="reaction-meta-item">ΔH: <strong style="color:' + deltaColor + ';">' + deltaText + '</strong></span>' +
      '</div>' +
      hazardHtml;

    return card;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
