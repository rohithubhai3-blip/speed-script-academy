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
// WORD TOKENIZER — handles punctuation per rules
// Keeps punctuation attached so we can detect full-stop mistakes
// -------------------------------------------------------
export function getWords(text) {
  return text
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

// Strip all punctuation from a word for clean comparison
function stripPunct(w) {
  return w.replace(/[.,!?;:'"()\-–—]/g, '');
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

  let i = 0, j = 0;

  // Add a full mistake helper (respects fullMistakeAllowed flag)
  const addFull = (delta = 1) => { if (r.fullMistakeAllowed) full += delta; };
  // Add a half mistake helper (respects halfMistakeAllowed flag)
  const addHalf = (delta = 1) => { if (r.halfMistakeAllowed) half += delta; };

  // ---- ALL-CAPS PENALTY (1 full mistake total, not per word) ----
  if (allCapsTyped) {
    addFull(1);
  }

  // -------------------------------------------------------
  // WORD-BY-WORD COMPARISON using two-pointer alignment
  // -------------------------------------------------------
  while (i < origWords.length && j < typedWords.length) {
    const oW  = origWords[i];
    const tW  = typedWords[j];

    const oClean = stripPunct(oW).toLowerCase();
    const tClean = stripPunct(tW).toLowerCase();

    // ── 1. EXACT MATCH ──────────────────────────────────
    if (oW === tW) {
      resultHtmlArray.push({ word: tW, type: 'correct', original: oW });
      i++; j++;
      continue;
    }

    // ── 2. ACCEPTED ALTERNATE SPELLING (No penalty) ─────
    if (isAcceptedAlternate(oClean, tClean)) {
      resultHtmlArray.push({ word: tW, type: 'correct', original: oW, note: 'alternate_spelling' });
      i++; j++;
      continue;
    }

    // ── 3. SAME BASE (differ only in punctuation/case) ──
    const sameBase = oClean === tClean;
    if (sameBase) {
      // oW !== tW already confirmed (step 1 exact match didn't pass)
      // Since same base letters, any difference must be case or punctuation
      const isCaseDiff = oW !== tW;  // FIX: was toLowerCase comparison — wrong for "He" vs "HE"
      const isPunctDiff = !isCaseDiff && oClean === tClean;

      // Check: missing/wrong full stop → half mistake
      const oHasStop = hasFullStop(oW);
      const tHasStop = hasFullStop(tW);
      const fullStopMissing = oHasStop && !tHasStop;
      const fullStopExtra   = !oHasStop && tHasStop;

      if (fullStopMissing || fullStopExtra) {
        if (r.punctRule !== 'Ignore') {
          if (r.punctRule === 'Full Mistake') { addFull(); }
          else { addHalf(); }
          resultHtmlArray.push({ word: tW, original: oW, type: 'punctuation', mistakeClass: 'half' });
        } else {
          resultHtmlArray.push({ word: tW, original: oW, type: 'correct' });
        }
        i++; j++;
        continue;
      }

      if (isCaseDiff) {
        // Check: is original a proper noun (starts with capital)?
        const isProperNoun = /^[A-Z]/.test(oW) && !/^[A-Z]{2,}$/.test(oW);
        // Check: small letter at start of sentence (first word)
        const isFirstWord = i === 0;

        if (r.capRule !== 'Ignore') {
          if (isProperNoun || isFirstWord) {
            // HALF mistake for not capitalizing proper noun / first letter of sentence
            if (r.capRule === 'Full Mistake') { addFull(); }
            else { addHalf(); }
            resultHtmlArray.push({ word: tW, original: oW, type: 'capitalization', mistakeClass: r.capRule === 'Full Mistake' ? 'full' : 'half' });
          } else {
            // Normal case difference → follow capRule
            if (r.capRule === 'Full Mistake') { addFull(); }
            else { addHalf(); }
            resultHtmlArray.push({ word: tW, original: oW, type: 'capitalization', mistakeClass: r.capRule === 'Full Mistake' ? 'full' : 'half' });
          }
        } else {
          resultHtmlArray.push({ word: tW, original: oW, type: 'correct' });
        }
        i++; j++;
        continue;
      }

      // Only punctuation diff and punctRule is ignore
      resultHtmlArray.push({ word: tW, original: oW, type: 'correct' });
      i++; j++;
      continue;
    }

    // ── 4. SINGULAR ↔ PLURAL VARIANT → half mistake ────
    if (isSingularPluralVariant(oClean, tClean)) {
      addHalf();
      resultHtmlArray.push({ word: tW, original: oW, type: 'singular_plural', mistakeClass: 'half' });
      i++; j++;
      continue;
    }

    // ── 5. SPELLING MISTAKE (close match) → half mistake ─
    //    Levenshtein ≤ 2 and word is long enough to not be unrelated
    const dist = levenshtein(oClean, tClean);
    const maxLen = Math.max(oClean.length, tClean.length);
    const isSpellClose = dist <= 2 && maxLen >= 3 && (dist / maxLen) <= 0.4;

    if (isSpellClose && !isAbbreviationMistake(oClean, tClean)) {
      if (r.similarWordRule === 'Strict') { addFull(); }
      else { addHalf(); }
      const cls = r.similarWordRule === 'Strict' ? 'full' : 'half';
      resultHtmlArray.push({ word: tW, original: oW, type: 'spelling', mistakeClass: cls });
      i++; j++;
      continue;
    }

    // ── 6. OMISSION — next typed word matches current orig ──
    //    Means user skipped oRaw[i]
    const lookahead = 2; // look 1-2 orig words ahead
    let omissionFound = false;
    for (let skip = 1; skip <= lookahead; skip++) {
      if (i + skip < origWords.length) {
        const nextOrig = stripPunct(origWords[i + skip]).toLowerCase();
        if (nextOrig === tClean) {
          // Mark each skipped original word as omission
          for (let s = 0; s < skip; s++) {
            addFull();
            resultHtmlArray.push({ word: origWords[i + s], original: origWords[i + s], type: 'missing', mistakeClass: 'full' });
          }
          i += skip;
          omissionFound = true;
          break;
        }
      }
    }
    if (omissionFound) continue;

    // ── 7. ADDITION — next orig word matches current typed ──
    //    Means user added an extra word
    const lookaheadT = 2;
    let additionFound = false;
    for (let skip = 1; skip <= lookaheadT; skip++) {
      if (j + skip < typedWords.length) {
        const nextTyped = stripPunct(typedWords[j + skip]).toLowerCase();
        if (nextTyped === oClean) {
          for (let s = 0; s < skip; s++) {
            addFull();
            resultHtmlArray.push({ word: typedWords[j + s], original: '', type: 'extra', mistakeClass: 'full' });
          }
          j += skip;
          additionFound = true;
          break;
        }
      }
    }
    if (additionFound) continue;

    // ── 8. REPETITION CHECK — typed same word twice ─────
    if (j > 0 && tClean === stripPunct(typedWords[j - 1]).toLowerCase()) {
      addFull();
      resultHtmlArray.push({ word: tW, original: oW, type: 'repetition', mistakeClass: 'full' });
      j++; // skip the repeated typed word, do NOT advance orig
      continue;
    }

    // ── 9. ABBREVIATION MISTAKE ─────────────────────────
    if (isAbbreviationMistake(oClean, tClean)) {
      addFull();
      resultHtmlArray.push({ word: tW, original: oW, type: 'abbreviation', mistakeClass: 'full' });
      i++; j++;
      continue;
    }

    // ── 10. SUBSTITUTION (completely different word) ─────
    // SSC Rule: Counts as 2 FULL mistakes:
    //   → 1 Full for the correct word that was OMITTED
    //   → 1 Full for the wrong word that was ADDED
    addFull();  // for the missing correct word
    resultHtmlArray.push({ word: oW, original: oW, type: 'missing', mistakeClass: 'full', note: 'substitution_missing' });
    addFull();  // for the extra wrong word typed
    resultHtmlArray.push({ word: tW, original: oW, type: 'substitution_extra', mistakeClass: 'full', note: 'substitution_extra' });
    i++; j++;
  }

  // ── REMAINING ORIGINAL WORDS → omissions (full mistake each) ──
  while (i < origWords.length) {
    addFull();
    resultHtmlArray.push({ word: origWords[i], original: origWords[i], type: 'missing', mistakeClass: 'full' });
    i++;
  }

  // ── REMAINING TYPED WORDS → leftover additions (full mistake each) ──
  while (j < typedWords.length) {
    addFull();
    resultHtmlArray.push({ word: typedWords[j], original: '', type: 'extra', mistakeClass: 'full' });
    j++;
  }

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

  // WPM: characters / 5 / minutes (standard gross WPM)
  const typedChars = typedText.replace(/\s+/g, ' ').trim().length;
  const grossWpm = timeTakenMinutes > 0 ? (typedChars / 5) / timeTakenMinutes : 0;
  // Net WPM adjusted for errors
  const netWpm = Math.max(0, Math.round(grossWpm - (errorUnits / Math.max(timeTakenMinutes, 1))));

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
