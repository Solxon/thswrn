/* Application wiring: theme, inputs, mode toggling and calculation orchestration */
(function () {
  const els = UI.els;

  // ----- Theme -----
  function applyTheme(theme) {
    if (theme === 'default' || !Storage.VALID_THEMES.includes(theme)) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.themeName === theme);
    });
  }

  const initialTheme = Storage.loadTheme();
  applyTheme(initialTheme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeName;
      applyTheme(theme);
      Storage.saveTheme(theme);
    });
  });

  // ----- Load persisted input values -----
  const savedDifficulty = Storage.loadInputValue('difficulty', 5);
  const savedModifier = Storage.loadInputValue('modifier', 0);
  const savedRerolls = Storage.loadInputValue('rerolls', 1);

  els.difficultyInput.value = savedDifficulty;
  els.modifierInput.value = savedModifier;
  els.rerollsInput.value = savedRerolls;

  let diceState = {
    yellow: Storage.loadInputValue('yellow', 0),
    red: Storage.loadInputValue('red', 0),
    black: Storage.loadInputValue('black', 0)
  };
  let currentMode = 'success';

  document.getElementById('yellowCount').textContent = diceState.yellow;
  document.getElementById('redCount').textContent = diceState.red;
  document.getElementById('blackCount').textContent = diceState.black;

  // ----- Mode toggle -----
  document.querySelectorAll('.mode-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;

      if (currentMode === 'combat') {
        els.optimalBadge.textContent = 'highest avg';
        els.difficultyLabel.textContent = 'Enemy Armor';
        els.difficultyInput.value = Math.max(1, parseInt(els.difficultyInput.value) || 5);
      } else {
        els.optimalBadge.textContent = 'best chance';
        els.difficultyLabel.textContent = 'Difficulty (target sum)';
      }
    });
  });

  // ----- Dice click controls -----
  document.querySelectorAll('.die-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const die = btn.dataset.die;
      const delta = parseInt(btn.dataset.delta);
      const max = 10;
      const newVal = Math.max(0, Math.min(max, diceState[die] + delta));
      diceState[die] = newVal;
      document.getElementById(die + 'Count').textContent = newVal;
      Storage.saveInputValue(die, newVal);
    });
  });

  // ----- Number stepper controls -----
  document.querySelectorAll('.step-up, .step-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      const delta = btn.classList.contains('step-up') ? 1 : -1;
      let val = parseFloat(input.value) || 0;
      let min = -Infinity;
      if (targetId === 'difficulty') min = 1;
      if (targetId === 'rerolls') min = 0;
      val = Math.max(min, val + delta);
      input.value = val;
      Storage.saveInputValue(targetId, val);
    });
  });

  // ----- Persist input values on manual change -----
  function attachPersistence(input, inputId) {
    input.addEventListener('change', () => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        let clean = val;
        if (inputId === 'difficulty' && clean < 1) clean = 1;
        if (inputId === 'rerolls' && clean < 0) clean = 0;
        if (clean !== val) input.value = clean;
        Storage.saveInputValue(inputId, clean);
      }
    });
  }

  attachPersistence(els.difficultyInput, 'difficulty');
  attachPersistence(els.modifierInput, 'modifier');
  attachPersistence(els.rerollsInput, 'rerolls');

  // ----- Calculation -----
  function runCalculation() {
    const rawDifficulty = parseInt(els.difficultyInput.value) || 5;
    const rawModifier = parseInt(els.modifierInput.value) || 0;
    const rawRerolls = parseInt(els.rerollsInput.value) || 0;

    const difficulty = Math.max(1, rawDifficulty);
    const modifier = rawModifier;
    const rerollTokens = Math.max(0, rawRerolls);

    Storage.saveInputValue('difficulty', difficulty);
    Storage.saveInputValue('modifier', modifier);
    Storage.saveInputValue('rerolls', rerollTokens);

    if (difficulty !== rawDifficulty) els.difficultyInput.value = difficulty;
    if (rerollTokens !== rawRerolls) els.rerollsInput.value = rerollTokens;

    const maxYellow = diceState.yellow;
    const maxRed = diceState.red;
    const maxBlack = diceState.black;
    const MAX_WHITE = 10;
    const MAX_TOTAL_DICE = 10;

    UI.showLoading(true);

    setTimeout(() => {
      const allResults = [];

      for (let w = 0; w <= MAX_WHITE; w++) {
        for (let y = 0; y <= maxYellow; y++) {
          for (let r = 0; r <= maxRed; r++) {
            for (let b = 0; b <= maxBlack; b++) {
              const totalDice = w + y + r + b;
              if (totalDice === 0) continue;
              if (totalDice > MAX_TOTAL_DICE) continue;
              const cfg = { white: w, yellow: y, red: r, black: b };
              const res = DiceEngine.calculateProbability(cfg, difficulty, modifier, rerollTokens);
              allResults.push(res);
            }
          }
        }
      }

      if (allResults.length === 0) {
        const fallback = DiceEngine.calculateProbability(
          { white: 1, yellow: 0, red: 0, black: 0 },
          difficulty, modifier, rerollTokens
        );
        allResults.push(fallback);
      }

      // Choose optimal based on mode
      let optimal;
      if (currentMode === 'combat') {
        const maxAvg = Math.max(...allResults.map(r => r.averageTotal));
        const nearBest = allResults.filter(r => (maxAvg - r.averageTotal) <= 0.25);
        optimal = nearBest.reduce((best, cur) => {
          if (cur.successRate > best.successRate) return cur;
          if (cur.successRate === best.successRate && cur.averageTotal > best.averageTotal) return cur;
          return best;
        }, nearBest[0]);
      } else {
        optimal = allResults.reduce((best, cur) => {
          if (cur.successRate > best.successRate) return cur;
          if (cur.successRate === best.successRate && cur.autoFailRate < best.autoFailRate) return cur;
          if (cur.successRate === best.successRate && cur.autoFailRate === best.autoFailRate && cur.averageTotal > best.averageTotal) return cur;
          return best;
        }, allResults[0]);
      }

      UI.showOptimal(optimal);

      // Sort results
      let sorted;
      if (currentMode === 'combat') {
        sorted = [...allResults].sort((a, b) => {
          if (b.averageTotal !== a.averageTotal) return b.averageTotal - a.averageTotal;
          return b.successRate - a.successRate;
        });
      } else {
        sorted = [...allResults].sort((a, b) => {
          if (b.successRate !== a.successRate) return b.successRate - a.successRate;
          if (a.autoFailRate !== b.autoFailRate) return a.autoFailRate - b.autoFailRate;
          return b.averageTotal - a.averageTotal;
        });
      }

      UI.renderResultsTable(sorted, optimal);
      UI.renderRerollProbability(optimal, rerollTokens);
      UI.showResults();
      UI.showLoading(false);
    }, 30);
  }

  els.calcBtn.addEventListener('click', runCalculation);

  const inputs = [els.difficultyInput, els.modifierInput, els.rerollsInput];
  inputs.forEach(inp => inp.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCalculation();
    }
  }));

  window.addEventListener('load', () => {
    setTimeout(runCalculation, 100);
  });
})();