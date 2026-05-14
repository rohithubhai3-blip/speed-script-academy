// ============================================================
// SSC STENOGRAPHY EVALUATION ENGINE
// Following official SSC / Government Stenography exam rules
// 
// FORMULA:
//   Error % = ((Full Mistakes + Half Mistakes / 2) × 100) / Total Words in Passage
//   Accuracy % = 100 - Error %
//
// FULL MISTAKES (count 1 each):
//   - Omission of a word/figure
//   - Substitution of wrong word/figure
//   - Addition of extra word/figure/symbol
//   - Repetition of words
//   - Incomplete word (partial match with large diff)
//   - Leftover typed words after passage completion
//   - Typing abbreviation instead of full word (or vice versa)
//   - Entire passage in CAPS when not required
//
// HALF MISTAKES (count 0.5 each):
//   - Spelling mistake (1-2 character difference in same word)
//   - Singular/plural mistake (e.g., word vs words)
//   - Missing or wrong full stop
//   - Small letter at start of sentence
//   - Not capitalizing proper noun
// ============================================================

// -------------------------------------------------------
// LEVENSHTEIN DISTANCE — how many edits to convert a → b
// -------------------------------------------------------
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// -------------------------------------------------------
// TEXT NORMALIZER — converts smart quotes, removes invisible chars
// This fixes the #1 cause of false mistakes: admin pastes from
// Word/Docs which inserts curly quotes (e.g. right single quote)
// instead of straight ones. Users type straight quotes from keyboard.
// -------------------------------------------------------
function normalizeText(text) {
  return text
    // Smart/curly single quotes to straight apostrophe
    .replace(/[\u2018\u2019\u201A\u2032\u0060]/g, "'")
    // Smart/curly double quotes to straight double quote
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    // En-dash / Em-dash to hyphen
    .replace(/[\u2013\u2014]/g, '-')
    // Ellipsis character to three dots
    .replace(/\u2026/g, '...')
    // Remove zero-width characters (ZWJ, ZWNJ, ZW-Space, BOM, soft-hyphen)
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F]/g, '')
    // Non-breaking space to regular space
    .replace(/\u00A0/g, ' ');
}

// -------------------------------------------------------
// WORD TOKENIZER — handles punctuation per rules
// Keeps punctuation attached so we can detect full-stop mistakes
// -------------------------------------------------------
export function getWords(text) {
  return normalizeText(text)
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

// Strip all punctuation from a word for clean comparison
function stripPunct(w) {
  return w.replace(/[.,!?;:'"()\-\u2013\u2014\u2018\u2019\u201C\u201D]/g, '');
}

// Check if a word ends with a full stop
function hasFullStop(w) {
  return /\.$/.test(w.trim());
}

// Detect singular↔plural variation (simple heuristic)
// Returns true if a and b are the same word just different in s/es/ies/ied
function isSingularPluralVariant(a, b) {
  const pluralForms = [
    [/s$/i, ''],
    [/es$/i, ''],
    [/ies$/i, 'y'],
    [/ied$/i, 'y'],
    [/ing$/i, ''],
  ];
  for (const [suffix, replacement] of pluralForms) {
    const aBase = a.replace(suffix, replacement);
    const bBase = b.replace(suffix, replacement);
    if (aBase === b || bBase === a || aBase === bBase) return true;
  }
  return false;
}

// Known acceptable alternate spellings — add more as needed
const ACCEPTED_ALTERNATES = [
  ['honourable', 'honorable'],
  ['colour', 'color'],
  ['honour', 'honor'],
  ['labour', 'labor'],
  ['behaviour', 'behavior'],
  ['neighbour', 'neighbor'],
  ['through', 'thru'],
];

function isAcceptedAlternate(a, b) {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  return ACCEPTED_ALTERNATES.some(
    ([x, y]) => (al === x && bl === y) || (al === y && bl === x)
  );
}

// Is the typed word likely an abbreviation of the original or vice versa?
function isAbbreviationMistake(orig, typed) {
  // abbrev: typed word is much shorter (< 60%) and starts with same letter
  const ol = orig.toLowerCase(), tl = typed.toLowerCase();
  if (tl.length < ol.length * 0.6 && ol.startsWith(tl[0])) return true;
  if (ol.length < tl.length * 0.6 && tl.startsWith(ol[0])) return true;
  return false;
}

// -------------------------------------------------------
// EVALUATE WORD PAIR (DP HELPER)
// -------------------------------------------------------
function evaluateWordPair(oW, tW, r, origIndex) {
  const oClean = stripPunct(oW).toLowerCase();
  const tClean = stripPunct(tW).toLowerCase();

  if (oW === tW) return { cost: 0, data: { word: tW, type: 'correct', original: oW } };

  if (isAcceptedAlternate(oClean, tClean)) return { cost: 0, data: { word: tW, type: 'correct', original: oW, note: 'alternate_spelling' } };

  if (oClean === tClean) {
    const isCaseDiff = oW !== tW;
    const oHasStop = hasFullStop(oW);
    const tHasStop = hasFullStop(tW);

    if (oHasStop !== tHasStop) {
      if (r.punctRule !== 'Ignore') {
        const cls = r.punctRule === 'Full Mistake' ? 'full' : 'half';
        const cost = cls === 'full' ? 1 : 0.5;
        return { cost, data: { word: tW, original: oW, type: 'punctuation', mistakeClass: cls } };
      } else {
        return { cost: 0, data: { word: tW, original: oW, type: 'correct' } };
      }
    }

    if (isCaseDiff) {
      const isProperNoun = /^[A-Z]/.test(oW) && !/^[A-Z]{2,}$/.test(oW);
      const isFirstWord = origIndex === 0;

      if (r.capRule !== 'Ignore') {
        const cls = r.capRule === 'Full Mistake' ? 'full' : 'half';
        const cost = cls === 'full' ? 1 : 0.5;
        // Apply mistake only if proper noun or first word OR cap rule strictly applies to all case differences
        // The original logic punished all case differences according to cap rule unless it was Ignore.
        return { cost, data: { word: tW, original: oW, type: 'capitalization', mistakeClass: cls } };
      } else {
        return { cost: 0, data: { word: tW, original: oW, type: 'correct' } };
      }
    }
    return { cost: 0, data: { word: tW, original: oW, type: 'correct' } };
  }

  if (isSingularPluralVariant(oClean, tClean)) {
    return { cost: 0.5, data: { word: tW, original: oW, type: 'singular_plural', mistakeClass: 'half' } };
  }

  if (Math.abs(oClean.length - tClean.length) <= 2) {
    const dist = levenshtein(oClean, tClean);
    const maxLen = Math.max(oClean.length, tClean.length);
    if (dist <= 2 && maxLen >= 3 && (dist / maxLen) <= 0.4 && !isAbbreviationMistake(oClean, tClean)) {
      const cls = r.similarWordRule === 'Strict' ? 'full' : 'half';
      const cost = cls === 'full' ? 1 : 0.5;
      return { cost, data: { word: tW, original: oW, type: 'spelling', mistakeClass: cls } };
    }
  }

  if (isAbbreviationMistake(oClean, tClean)) {
    return { cost: 1, data: { word: tW, original: oW, type: 'abbreviation', mistakeClass: 'full' } };
  }

  return { cost: 1, data: { word: tW, original: oW, type: 'substitution_extra', mistakeClass: 'full', note: 'substitution_extra' } };
}

// -------------------------------------------------------
// MAIN SSC ENGINE
// -------------------------------------------------------
export function analyzeTestResult(originalText, typedText, timeTakenMinutes, rules) {
  const r = {
    capRule:         rules?.capRule         || 'Half Mistake',
    punctRule:       rules?.punctRule       || 'Half Mistake',
    similarWordRule: rules?.similarWordRule || 'Allow (Half Mistake)',
    halfMistakeAllowed: rules?.halfMistakeAllowed !== false,
    fullMistakeAllowed: rules?.fullMistakeAllowed !== false,
    allowedErrorPercent: rules?.allowedErrorPercent ?? 5,
  };

  // Normalize similarWordRule
  if (r.similarWordRule.includes('Half Mistake')) r.similarWordRule = 'Half Mistake';
  else if (r.similarWordRule.includes('Strict'))  r.similarWordRule = 'Strict';

  // ---------- Detect ALL-CAPS passage ----------
  const typedWords = getWords(typedText);
  const origWords  = getWords(originalText);

  const allCapsCount = typedWords.filter(w => /^[A-Z]{2,}$/.test(w)).length;
  const allCapsTyped = typedWords.length > 3 && allCapsCount > typedWords.length * 0.7;

  let full = 0; // integer count of full mistakes
  let half = 0; // integer count of half mistakes (each = 0.5 error unit)
  let resultHtmlArray = [];

  // Add a full mistake helper (respects fullMistakeAllowed flag)
  const addFull = (delta = 1) => { if (r.fullMistakeAllowed) full += delta; };
  // Add a half mistake helper (respects halfMistakeAllowed flag)
  const addHalf = (delta = 1) => { if (r.halfMistakeAllowed) half += delta; };

  // ---- ALL-CAPS PENALTY (1 full mistake total, not per word) ----
  if (allCapsTyped) {
    addFull(1);
  }

  // -------------------------------------------------------
  // DYNAMIC PROGRAMMING SEQUENCE ALIGNMENT (Wagner-Fischer)
  // -------------------------------------------------------
  const N = origWords.length;
  const M = typedWords.length;

  // Use 1D typed arrays for a fast (N+1) x (M+1) matrix
  const dp = new Float64Array((N + 1) * (M + 1));
  const back = new Uint8Array((N + 1) * (M + 1)); // 1: sub, 2: del, 3: ins

  const idx = (i, j) => i * (M + 1) + j;

  // Base cases
  for (let i = 1; i <= N; i++) {
    dp[idx(i, 0)] = i; // i deletions (full mistakes)
    back[idx(i, 0)] = 2; // del
  }
  for (let j = 1; j <= M; j++) {
    dp[idx(0, j)] = j; // j insertions (full mistakes)
    back[idx(0, j)] = 3; // ins
  }

  // DP computation
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const oW = origWords[i - 1];
      const tW = typedWords[j - 1];

      // Fast inline cost estimation
      let subCost = 1; // default full mistake

      const oClean = stripPunct(oW).toLowerCase();
      const tClean = stripPunct(tW).toLowerCase();

      if (oW === tW) {
        subCost = 0;
      } else if (isAcceptedAlternate(oClean, tClean)) {
        subCost = 0;
      } else if (oClean === tClean) {
        // Same letters, different case or punctuation
        const isCaseDiff = oW !== tW;
        const oHasStop = hasFullStop(oW);
        const tHasStop = hasFullStop(tW);

        if (oHasStop !== tHasStop) {
          subCost = r.punctRule === 'Ignore' ? 0 : (r.punctRule === 'Full Mistake' ? 1 : 0.5);
        } else if (isCaseDiff) {
          subCost = r.capRule === 'Ignore' ? 0 : (r.capRule === 'Full Mistake' ? 1 : 0.5);
        } else {
          subCost = 0;
        }
      } else if (isSingularPluralVariant(oClean, tClean)) {
        subCost = 0.5;
      } else if (Math.abs(oClean.length - tClean.length) <= 2) {
        const maxLen = Math.max(oClean.length, tClean.length);
        if (maxLen >= 3) {
          const dist = levenshtein(oClean, tClean);
          if (dist <= 2 && (dist / maxLen) <= 0.4 && !isAbbreviationMistake(oClean, tClean)) {
            subCost = r.similarWordRule === 'Strict' ? 1 : 0.5;
          }
        }
      }

      const costSub = dp[idx(i - 1, j - 1)] + subCost;
      const costDel = dp[idx(i - 1, j)] + 1; // 1 full mistake
      const costIns = dp[idx(i, j - 1)] + 1; // 1 full mistake

      let minCost = costSub;
      let action = 1; // sub

      if (costDel < minCost) { minCost = costDel; action = 2; }
      if (costIns < minCost) { minCost = costIns; action = 3; }

      dp[idx(i, j)] = minCost;
      back[idx(i, j)] = action;
    }
  }

  // -------------------------------------------------------
  // BACKTRACKING PATH RECONSTRUCTION
  // -------------------------------------------------------
  let i = N;
  let j = M;
  const path = [];

  while (i > 0 || j > 0) {
    const action = back[idx(i, j)];

    if (action === 1) { // Substitution / Match
      const evalData = evaluateWordPair(origWords[i - 1], typedWords[j - 1], r, i - 1);
      path.push(evalData.data);

      if (evalData.cost === 1 && evalData.data.mistakeClass === 'full') {
        addFull();
      } else if (evalData.cost === 0.5 || evalData.data.mistakeClass === 'half') {
        addHalf();
      }
      i--; j--;
    } else if (action === 2) { // Deletion (Missing word)
      addFull();
      path.push({ word: origWords[i - 1], original: origWords[i - 1], type: 'missing', mistakeClass: 'full' });
      i--;
    } else if (action === 3) { // Insertion (Extra word)
      addFull();
      path.push({ word: typedWords[j - 1], original: '', type: 'extra', mistakeClass: 'full' });
      j--;
    }
  }

  // The path was reconstructed from end to start, so reverse it
  resultHtmlArray = path.reverse();

  // -------------------------------------------------------
  // SSC FORMULA:
  //   Error % = (Full + Half/2) × 100 / Total Passage Words
  // -------------------------------------------------------
  const totalPassageWords = origWords.length;
  const totalTypedWords   = typedWords.length;

  // Error units = full mistakes + half mistakes × 0.5
  const errorUnits = full + half * 0.5;

  let errorPercent = totalPassageWords > 0
    ? (errorUnits * 100) / totalPassageWords
    : 0;
  if (errorPercent > 100) errorPercent = 100;

  const accuracy = Math.max(0, 100 - errorPercent);

  // -------------------------------------------------------
  // NET WPM — SSC Stenography formula:
  //   Gross WPM = Total Words Typed / Time (minutes)
  //   Net WPM   = (Typed Words - Full Mistakes - Half Mistakes × 0.5) / Time
  //
  // We floor at 0 — no negative WPM.
  // -------------------------------------------------------
  const grossWpm = timeTakenMinutes > 0 ? totalTypedWords / timeTakenMinutes : 0;
  const netWpm   = Math.max(0, Math.round((totalTypedWords - errorUnits) / Math.max(timeTakenMinutes, 1)));

  return {
    totalWords:   totalPassageWords,
    typedWords:   totalTypedWords,
    fullMistakes: full,
    halfMistakes: half,
    errorUnits:   +errorUnits.toFixed(2),
    totalMistakes: +errorUnits.toFixed(2),   // kept for backward compat
    errorPercent:  +errorPercent.toFixed(2),
    accuracy:      +accuracy.toFixed(2),
    wpm:           netWpm,
    visualHTML:    resultHtmlArray,
    allCapsDetected: allCapsTyped,
  };
}
