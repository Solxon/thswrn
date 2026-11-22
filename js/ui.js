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
    calculator: document.getElementById('calculator'),
    damageChartSection: document.getElementById('damageChartSection'),
    damageChartCanvas: document.getElementById('damageChartCanvas'),
    damageChartLegend: document.getElementById('damageChartLegend')
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

  /* ----- Damage distribution chart ----- */
  function renderDamageChart(distribution, armor) {
    if (!distribution || distribution.length === 0) {
      els.damageChartSection.classList.add('hidden');
      return;
    }
    els.damageChartSection.classList.remove('hidden');

    const canvas = els.damageChartCanvas;
    const ctx = canvas.getContext('2d');

    // Set canvas backing size for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.parentElement.clientWidth || 600;
    const cssHeight = 240;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssWidth;
    const height = cssHeight;
    const padding = { top: 24, right: 18, bottom: 42, left: 52 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // Read theme colors from CSS variables
    const styles = getComputedStyle(document.documentElement);
    const colText = styles.getPropertyValue('--text-muted').trim() || '#888';
    const colGrid = styles.getPropertyValue('--border-main').trim() || '#333';
    const colAccent = styles.getPropertyValue('--accent').trim() || '#e8805a';
    const colTrack = styles.getPropertyValue('--bar-track').trim() || '#222';

    const maxProb = Math.max(...distribution, 0.0001);
    const yMax = Math.ceil(maxProb * 1.15 * 100) / 100; // round up a bit
    const barGap = 10;
    const barWidth = (plotW - barGap * (distribution.length - 1)) / distribution.length;

    // Y-axis gridlines & labels
    const gridLines = 4;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= gridLines; i++) {
      const frac = i / gridLines;
      const y = padding.top + plotH - frac * plotH;
      const val = yMax * frac;

      ctx.strokeStyle = colGrid;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = colText;
      ctx.fillText((val * 100).toFixed(0) + '%', padding.left - 8, y);
    }

    // Bars
    distribution.forEach((prob, i) => {
      const x = padding.left + i * (barWidth + barGap);
      const barH = (prob / yMax) * plotH;
      const y = padding.top + plotH - barH;

      // Background track
      ctx.fillStyle = colTrack;
      ctx.beginPath();
      roundRect(ctx, x, padding.top, barWidth, plotH, 6);
      ctx.fill();

      // Bar fill with gradient
      const grad = ctx.createLinearGradient(0, y, 0, padding.top + plotH);
      grad.addColorStop(0, colAccent);
      grad.addColorStop(1, shadeColor(colAccent, -25));
      ctx.fillStyle = grad;
      ctx.beginPath();
      roundRect(ctx, x, y, barWidth, Math.max(barH, 2), 6);
      ctx.fill();

      // Value label above bar
      if (prob > 0.005) {
        ctx.fillStyle = colText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText((prob * 100).toFixed(1) + '%', x + barWidth / 2, y - 4);
      }

      // X-axis label
      ctx.fillStyle = colText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText(String(i), x + barWidth / 2, padding.top + plotH + 10);
    });

    // X-axis title
    ctx.fillStyle = colText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('damage dealt', padding.left + plotW / 2, height - 14);

    // Y-axis title (rotated)
    ctx.save();
    ctx.translate(12, padding.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('probability', 0, 0);
    ctx.restore();

    // Legend for expected damage
    let expected = 0;
    distribution.forEach((p, i) => { expected += p * i; });
    els.damageChartLegend.innerHTML =
      `Expected damage: <strong>${expected.toFixed(2)}</strong> &nbsp;·&nbsp; ` +
      `Armor: <strong>${armor}</strong> &nbsp;·&nbsp; ` +
      `Chance of 0 dmg: <strong>${(distribution[0] * 100).toFixed(1)}%</strong>`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (h < r * 2) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function shadeColor(hex, percent) {
    // hex like "#e8805a"
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, r + Math.round(255 * percent / 100)));
    g = Math.max(0, Math.min(255, g + Math.round(255 * percent / 100)));
    b = Math.max(0, Math.min(255, b + Math.round(255 * percent / 100)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function showDamageChart(show) {
    if (show) els.damageChartSection.classList.remove('hidden');
    else els.damageChartSection.classList.add('hidden');
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
    renderDamageChart,
    showDamageChart,
    showLoading,
    showResults
  };
})();