(function () {
  'use strict';

  var ALL_REACTIONS = [];
  var REACTANTS = []; // unique reactants from database
  var slotA = null;
  var slotB = null;

  function boot() {
    console.log('[Lab] boot');
    fetch('data/reactions.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        ALL_REACTIONS = data;
        console.log('[Lab] loaded reactions:', ALL_REACTIONS.length);
        buildReactantList();
        renderPicker();
        attachEvents();
        console.log('[Lab] ✅ ready');
      })
      .catch(function (err) {
        console.error('[Lab] error:', err);
        document.getElementById('reactantGrid').innerHTML =
          '<p style="color:#f87171;grid-column:1/-1;">Failed to load: ' + err.message + '</p>';
      });
  }

  function buildReactantList() {
    var map = {};
    ALL_REACTIONS.forEach(function (r) {
      r.reactants.forEach(function (rt) {
        if (!map[rt.formula]) {
          map[rt.formula] = { formula: rt.formula, name: rt.name };
        }
      });
    });
    REACTANTS = Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    console.log('[Lab] unique reactants:', REACTANTS.length);
  }

  function renderPicker() {
    var grid = document.getElementById('reactantGrid');
    if (!grid) return;
    grid.innerHTML = '';
    REACTANTS.forEach(function (rt) {
      var chip = document.createElement('button');
      chip.className = 'reactant-chip';
      chip.dataset.formula = rt.formula;
      chip.dataset.name = rt.name.toLowerCase();
      chip.innerHTML =
        '<span class="rc-formula">' + escapeHtml(rt.formula) + '</span>' +
        '<span class="rc-name">' + escapeHtml(rt.name) + '</span>';
      chip.addEventListener('click', function () { pickReactant(rt); });
      grid.appendChild(chip);
    });
    updateChipStates();
  }

  function pickReactant(rt) {
    if (!slotA) {
      slotA = rt;
    } else if (!slotB && rt.formula !== slotA.formula) {
      slotB = rt;
    } else if (rt.formula === slotA.formula && !slotB) {
      // Same as slot A and no slot B — allow (e.g. 2H2 + O2 needs H2 twice? no, only if reaction requires same)
      // For simplicity: don't allow duplicates in slots
      return;
    } else {
      // Both full — replace slot B
      slotB = rt;
    }
    updateSlots();
    updateChipStates();
  }

  function updateSlots() {
    renderSlot('slotA', slotA, 'A');
    renderSlot('slotB', slotB, 'B');
    var mixBtn = document.getElementById('mixBtn');
    if (mixBtn) mixBtn.disabled = (!slotA && !slotB);
    var liquid = document.getElementById('beakerLiquid');
    if (liquid) {
      liquid.setAttribute('opacity', (slotA || slotB) ? '0.7' : '0');
    }
  }

  function renderSlot(id, data, slotKey) {
    var el = document.getElementById(id);
    if (!el) return;
    if (data) {
      el.classList.add('filled');
      el.innerHTML =
        '<span class="slot-formula">' + escapeHtml(data.formula) + '</span>' +
        '<span class="slot-name">' + escapeHtml(data.name) + '</span>';
    } else {
      el.classList.remove('filled');
      el.innerHTML =
        '<div class="slot-plus">+</div>' +
        '<div class="slot-label">Add reactant</div>';
    }
  }

  function updateChipStates() {
    document.querySelectorAll('.reactant-chip').forEach(function (chip) {
      var f = chip.dataset.formula;
      var inA = slotA && slotA.formula === f;
      var inB = slotB && slotB.formula === f;
      chip.classList.toggle('selected', !!(inA || inB));
    });
  }

  function clearSlots() {
    slotA = null;
    slotB = null;
    updateSlots();
    updateChipStates();
    var panel = document.getElementById('resultPanel');
    if (panel) { panel.classList.remove('visible', 'success', 'none'); panel.innerHTML = ''; }
    var beaker = document.getElementById('beakerWrap');
    if (beaker) beaker.classList.remove('mixing');
    var liquid = document.getElementById('beakerLiquid');
    if (liquid) liquid.setAttribute('opacity', '0');
  }

  function mix() {
    if (!slotA && !slotB) return;
    var beaker = document.getElementById('beakerWrap');
    if (beaker) {
      beaker.classList.add('mixing');
      setTimeout(function () { beaker.classList.remove('mixing'); }, 2500);
    }

    var result = findReaction(slotA, slotB);
    setTimeout(function () { showResult(result); }, 600);
  }

  function findReaction(a, b) {
    // Case: only 1 reactant (decomposition)
    if (a && !b) {
      return ALL_REACTIONS.find(function (r) {
        return r.reactants.length === 1 && r.reactants[0].formula === a.formula;
      }) || null;
    }
    if (!a && b) {
      return ALL_REACTIONS.find(function (r) {
        return r.reactants.length === 1 && r.reactants[0].formula === b.formula;
      }) || null;
    }
    // Case: 2 reactants (order-independent)
    return ALL_REACTIONS.find(function (r) {
      if (r.reactants.length !== 2) return false;
      var r1 = r.reactants[0].formula;
      var r2 = r.reactants[1].formula;
      return (r1 === a.formula && r2 === b.formula) || (r1 === b.formula && r2 === a.formula);
    }) || null;
  }

  function showResult(reaction) {
    var panel = document.getElementById('resultPanel');
    if (!panel) return;
    panel.classList.add('visible');

    if (reaction) {
      panel.classList.add('success');
      panel.classList.remove('none');
      var deltaText = (reaction.delta_h > 0 ? '+' : '') + reaction.delta_h + ' kJ/mol';
      var deltaColor = reaction.delta_h < 0 ? '#34d399' : '#f87171';
      var hazardHtml = reaction.hazard
        ? '<div class="result-description warn">⚠️ <strong>Hazard:</strong> ' + escapeHtml(reaction.hazard) + '</div>'
        : '';

      panel.innerHTML =
        '<h3>✅ Reaction Found</h3>' +
        '<div class="result-equation">' + escapeHtml(reaction.equation) + '</div>' +
        '<div class="result-info-grid">' +
          '<div class="result-info-item"><div class="info-label">Category</div><div class="info-value">' + capitalize(reaction.category) + '</div></div>' +
          '<div class="result-info-item"><div class="info-label">ΔH</div><div class="info-value" style="color:' + deltaColor + ';">' + deltaText + '</div></div>' +
          '<div class="result-info-item"><div class="info-label">Difficulty</div><div class="info-value">' + capitalize(reaction.difficulty) + '</div></div>' +
        '</div>' +
        '<div class="result-description">' + escapeHtml(reaction.description) + '</div>' +
        hazardHtml;
    } else {
      panel.classList.add('none');
      panel.classList.remove('success');
      var a = slotA ? slotA.name : '';
      var b = slotB ? slotB.name : '';
      var combo = [a, b].filter(Boolean).join(' + ');
      panel.innerHTML =
        '<h3>No Known Reaction</h3>' +
        '<div class="result-description">' +
          '<strong>' + escapeHtml(combo) + '</strong> — in do chemicals ka koi reaction hamare 30-reaction database mein nahi hai. ' +
          'Ho sakta hai ye standard conditions par react na karein, ya reaction abhi database mein add nahi hui.' +
        '</div>';
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function capitalize(s) {
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function attachEvents() {
    var mixBtn = document.getElementById('mixBtn');
    if (mixBtn) mixBtn.addEventListener('click', mix);
    var clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearSlots);

    ['slotA', 'slotB'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function () {
        if (id === 'slotA' && slotA) { slotA = null; }
        else if (id === 'slotB' && slotB) { slotB = null; }
        updateSlots();
        updateChipStates();
      });
    });

    var search = document.getElementById('pickerSearch');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase().trim();
        document.querySelectorAll('.reactant-chip').forEach(function (chip) {
          var match = chip.dataset.name.indexOf(q) > -1 || chip.dataset.formula.toLowerCase().indexOf(q) > -1;
          chip.classList.toggle('disabled', !match);
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
