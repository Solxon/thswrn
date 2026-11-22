/* Dice definitions, rolling logic and Monte Carlo simulation */
const DiceEngine = (function () {
  const DICE_TYPES = {
    WHITE: {
      name: 'White',
      faces: [0, 0, 1, 1, 2, { value: 2, critical: true }]
    },
    YELLOW: {
      name: 'Yellow',
      faces: [0, 0, 1, 2, 3, { value: 3, critical: true }]
    },
    RED: {
      name: 'Red',
      faces: [0, 0, 2, 3, 3, { value: 4, critical: true }]
    },
    BLACK: {
      name: 'Black',
      faces: [0, 0, 3, 3, 4, { value: 5, critical: true }]
    }
  };

  function rollDie(dieType) {
    const faces = DICE_TYPES[dieType].faces;
    let total = 0;
    let face = faces[Math.floor(Math.random() * faces.length)];

    const firstFaceIsBlank = (typeof face !== 'object' && face === 0) ||
                             (typeof face === 'object' && face.value === 0);

    while (typeof face === 'object' && face.critical) {
      total += face.value;
      face = faces[Math.floor(Math.random() * faces.length)];
    }

    total += (typeof face === 'object') ? face.value : face;

    return { total, isBlank: firstFaceIsBlank };
  }

  function simulateRoll(diceConfig, difficulty, modifier, rerollTokens) {
    let rolls = [];
    for (let i = 0; i < diceConfig.white; i++) rolls.push({ ...rollDie('WHITE'), type: 'WHITE' });
    for (let i = 0; i < diceConfig.yellow; i++) rolls.push({ ...rollDie('YELLOW'), type: 'YELLOW' });
    for (let i = 0; i < diceConfig.red; i++) rolls.push({ ...rollDie('RED'), type: 'RED' });
    for (let i = 0; i < diceConfig.black; i++) rolls.push({ ...rollDie('BLACK'), type: 'BLACK' });

    if (rolls.length === 0) {
      const total = modifier;
      const success = total >= difficulty;
      return { success, total: success ? total : 0, autoFail: false, tokensUsed: 0 };
    }

    let blankCount = rolls.filter(r => r.isBlank).length;
    let rawTotal = rolls.reduce((s, r) => s + r.total, 0);
    let autoFail = blankCount >= 2;

    let tokensUsed = 0;
    let tokensLeft = rerollTokens;

    while (tokensLeft > 0 && rolls.length > 0) {
      if (!autoFail && (rawTotal + modifier) >= difficulty) break;
      if (autoFail) break;

      let worstIndex = -1;
      let worstScore = Infinity;

      for (let i = 0; i < rolls.length; i++) {
        const r = rolls[i];
        if (r.isBlank) {
          worstIndex = i;
          break;
        }
        if (r.total < worstScore) {
          worstScore = r.total;
          worstIndex = i;
        }
      }

      if (worstIndex === -1) break;

      const worstDie = rolls[worstIndex];
      const shouldReroll = worstDie.isBlank || worstDie.total <= 1;

      if (!shouldReroll) break;

      const type = worstDie.type;
      rolls.splice(worstIndex, 1);
      const newRoll = { ...rollDie(type), type };
      rolls.push(newRoll);

      rawTotal = rolls.reduce((s, r) => s + r.total, 0);
      blankCount = rolls.filter(r => r.isBlank).length;
      autoFail = blankCount >= 2;

      tokensUsed++;
      tokensLeft--;
    }

    const finalTotal = autoFail ? 0 : rawTotal + modifier;
    const success = !autoFail && finalTotal >= difficulty;

    return { success, total: finalTotal, autoFail, tokensUsed };
  }

  function calculateProbability(diceConfig, difficulty, modifier, rerollTokens, trials = 40000) {
    let successes = 0;
    let autoFails = 0;
    let totalSum = 0;
    const tokenUsageCounts = new Array(rerollTokens + 1).fill(0);

    for (let i = 0; i < trials; i++) {
      const res = simulateRoll(diceConfig, difficulty, modifier, rerollTokens);
      if (res.success) successes++;
      if (res.autoFail) autoFails++;
      totalSum += res.total;
      tokenUsageCounts[res.tokensUsed]++;
    }

    const tokenUsageProbs = tokenUsageCounts.map(c => c / trials);

    return {
      diceConfig: { ...diceConfig },
      successRate: successes / trials,
      autoFailRate: autoFails / trials,
      averageTotal: totalSum / trials,
      tokenUsageProbs
    };
  }

  /**
   * Calculate damage distribution for combat mode.
   * Damage on a hit = floor(total / armor), capped at 0..6.
   * Returns an array of 7 probabilities (damage 0 through 6).
   * Damage 0 includes misses/auto-fails.
   */
  function calculateDamageDistribution(diceConfig, armor, modifier, rerollTokens, trials = 40000) {
    const buckets = new Array(7).fill(0);
    const armorVal = Math.max(1, armor);

    for (let i = 0; i < trials; i++) {
      const res = simulateRoll(diceConfig, armorVal, modifier, rerollTokens);
      let dmg = 0;
      if (res.success && !res.autoFail) {
        dmg = Math.floor(res.total / armorVal);
        if (dmg > 6) dmg = 6;
        if (dmg < 0) dmg = 0;
      }
      buckets[dmg]++;
    }

    return buckets.map(c => c / trials);
  }

  function formatDiceConfig(cfg) {
    const parts = [];
    if (cfg.white > 0) parts.push(`${cfg.white}W`);
    if (cfg.yellow > 0) parts.push(`${cfg.yellow}Y`);
    if (cfg.red > 0) parts.push(`${cfg.red}R`);
    if (cfg.black > 0) parts.push(`${cfg.black}B`);
    return parts.join(' + ') || '0';
  }

  return {
    DICE_TYPES,
    rollDie,
    simulateRoll,
    calculateProbability,
    calculateDamageDistribution,
    formatDiceConfig
  };
})();