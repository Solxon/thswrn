/* DOM rendering helpers */
const UI = (function () {
  const els = {
    difficultyInput: document.getElementById('difficulty'),
    modifierInput: document.getElementById('modifier'),
    rerollsInput: document.getElementById('rerolls'),
    calcBtn: document.getElementById('calcBtn'),
    loadingDiv: document.getElementById('loading'),
    optimalCard: document.getElementById('optimalCard'),
    resultsSection: document.getElementById('resultsSection'),
    optSuccess: document.getElementById('optSuccess'),
    optFail: document.getElementById('optFail'),
    optAvg: document.getElementById('optAvg'),
    resultsBody: document.getElementById('resultsBody'),
    rerollProbSection: document.getElementById('rerollProbSection'),
    rerollProbBars: document.getElementById('rerollProbBars'),
    optimalBadge: document.getElementById('optimalBadge'),
    stat1Label: document.getElementById('stat1Label'),
    stat2Label: document.getElementById('stat2Label'),
    thSuccess: document.getElementById('thSuccess'),
    thFail: document.getElementById('thFail'),
    difficultyCard: document.getElementById('difficultyCard'),
    difficultyLabel: document.getElementById('difficultyLabel'),
    optimalDiceDisplay: document.getElementById('optimalDiceDisplay'),
    calculator: document.getElementById('calculator')
  };

  function buildOptimalDiceDisplay(cfg) {
    const container = els.optimalDiceDisplay;
    container.innerHTML = '';

    const types = [
      { key: 'white', css: 'die-white', label: 'White' },
      { key: 'yellow', css: 'die-yellow', label: 'Yellow' },
      { key: 'red', css: 'die-red', label: 'Red' },
      { key: 'black', css: 'die-black', label: 'Black' }
    ];

    let any = false;
    types.forEach(t => {
      const count = cfg[t.key];
      if (count > 0) {
        any = true;
        const group = document.createElement('div');
        group.className = 'optimal-die-group';
        group.innerHTML = `
          <div class="die-icon ${t.css}">${t.label[0]}</div>
          <span class="optimal-die-count">${count}</span>
          <span class="optimal-die-label">${t.label}</span>
        `;
        container.appendChild(group);
      }
    });

    if (!any) {
      container.innerHTML = '<span style="color:var(--text-muted); font-size:0.9rem;">No dice selected</span>';
    }
  }

  function showOptimal(optimal) {
    buildOptimalDiceDisplay(optimal.diceConfig);
    els.optSuccess.textContent = (optimal.successRate * 100).toFixed(2) + '%';
    els.optFail.textContent = (optimal.autoFailRate * 100).toFixed(2) + '%';
    els.optAvg.textContent = optimal.averageTotal.toFixed(2);
    els.optimalCard.classList.remove('hidden');
  }

  function renderResultsTable(sorted, optimal) {
    const top = sorted.slice(0, 12);
    els.resultsBody.innerHTML = '';

    top.forEach(res => {
      const tr = document.createElement('tr');
      const isOptimal = res.diceConfig.white === optimal.diceConfig.white &&
                        res.diceConfig.yellow === optimal.diceConfig.yellow &&
                        res.diceConfig.red === optimal.diceConfig.red &&
                        res.diceConfig.black === optimal.diceConfig.black;
      if (isOptimal) tr.classList.add('optimal-row');

      tr.innerHTML = `
        <td>${DiceEngine.formatDiceConfig(res.diceConfig)}</td>
        <td>${(res.successRate * 100).toFixed(2)}%</td>
        <td>${(res.autoFailRate * 100).toFixed(2)}%</td>
        <td>${res.averageTotal.toFixed(2)}</td>
      `;
      els.resultsBody.appendChild(tr);
    });
  }

  function renderRerollProbability(optimal, rerollTokens) {
    if (rerollTokens > 0) {
      els.rerollProbSection.classList.remove('hidden');
      els.rerollProbBars.innerHTML = '';

      for (let k = 0; k <= rerollTokens; k++) {
        const prob = optimal.tokenUsageProbs[k] || 0;
        const pct = (prob * 100).toFixed(2);

        const barDiv = document.createElement('div');
        barDiv.className = 'reroll-prob-bar';
        barDiv.innerHTML = `
          <div class="reroll-prob-label">${k} token${k !== 1 ? 's' : ''} used</div>
          <div class="reroll-prob-track">
            <div class="reroll-prob-fill" style="width: ${pct}%"></div>
          </div>
          <div class="reroll-prob-value">${pct}%</div>
        `;
        els.rerollProbBars.appendChild(barDiv);
      }
    } else {
      els.rerollProbSection.classList.add('hidden');
    }
  }

  function showLoading(show) {
    if (show) {
      els.calcBtn.disabled = true;
      els.loadingDiv.classList.remove('hidden');
    } else {
      els.loadingDiv.classList.add('hidden');
      els.calcBtn.disabled = false;
    }
  }

  function showResults() {
    els.resultsSection.classList.remove('hidden');
  }

  return {
    els,
    buildOptimalDiceDisplay,
    showOptimal,
    renderResultsTable,
    renderRerollProbability,
    showLoading,
    showResults
  };
})();