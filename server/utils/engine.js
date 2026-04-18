// ============================================================
// SSC STENOGRAPHY EVALUATION ENGINE (Server-side copy)
// Same logic as src/utils/engine.js — keep in sync
// ============================================================

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

export function getWords(text) {
  return text
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

function stripPunct(w) {
  return w.replace(/[.,!?;:'"()\-–—]/g, '');
}

function hasFullStop(w) {
  return /\.$/.test(w.trim());
}

function isSingularPluralVariant(a, b) {
  const forms = [[/s$/i, ''], [/es$/i, ''], [/ies$/i, 'y'], [/ied$/i, 'y'], [/ing$/i, '']];
  for (const [suffix, replacement] of forms) {
    const aBase = a.replace(suffix, replacement);
    const bBase = b.replace(suffix, replacement);
    if (aBase === b || bBase === a || aBase === bBase) return true;
  }
  return false;
}

const ACCEPTED_ALTERNATES = [
  ['honourable', 'honorable'], ['colour', 'color'], ['honour', 'honor'],
  ['labour', 'labor'], ['behaviour', 'behavior'], ['neighbour', 'neighbor'],
  ['through', 'thru'],
];

function isAcceptedAlternate(a, b) {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  return ACCEPTED_ALTERNATES.some(([x, y]) => (al === x && bl === y) || (al === y && bl === x));
}

function isAbbreviationMistake(orig, typed) {
  const ol = orig.toLowerCase(), tl = typed.toLowerCase();
  if (tl.length < ol.length * 0.6 && ol.startsWith(tl[0])) return true;
  if (ol.length < tl.length * 0.6 && tl.startsWith(ol[0])) return true;
  return false;
}

export function analyzeTestResult(originalText, typedText, timeTakenMinutes, rules) {
  const r = {
    capRule:             rules?.capRule             || 'Half Mistake',
    punctRule:           rules?.punctRule           || 'Half Mistake',
    similarWordRule:     rules?.similarWordRule      || 'Allow (Half Mistake)',
    halfMistakeAllowed:  rules?.halfMistakeAllowed  !== false,
    fullMistakeAllowed:  rules?.fullMistakeAllowed  !== false,
    allowedErrorPercent: rules?.allowedErrorPercent || 5,
  };

  if (r.similarWordRule.includes('Half Mistake')) r.similarWordRule = 'Half Mistake';
  else if (r.similarWordRule.includes('Strict'))  r.similarWordRule = 'Strict';

  const typedWords = getWords(typedText);
  const origWords  = getWords(originalText);

  const allCapsCount = typedWords.filter(w => /^[A-Z]{2,}$/.test(w)).length;
  const allCapsTyped = typedWords.length > 3 && allCapsCount > typedWords.length * 0.7;

  let full = 0, half = 0;
  let resultHtmlArray = [];
  let i = 0, j = 0;

  const addFull = (d = 1) => { if (r.fullMistakeAllowed) full += d; };
  const addHalf = (d = 1) => { if (r.halfMistakeAllowed) half += d; };

  if (allCapsTyped) addFull(1);

  while (i < origWords.length && j < typedWords.length) {
    const oW = origWords[i], tW = typedWords[j];
    const oClean = stripPunct(oW).toLowerCase();
    const tClean = stripPunct(tW).toLowerCase();

    // 1. Exact
    if (oW === tW) {
      resultHtmlArray.push({ word: tW, type: 'correct', original: oW });
      i++; j++;
      continue;
    }

    // 2. Accepted alternate
    if (isAcceptedAlternate(oClean, tClean)) {
      resultHtmlArray.push({ word: tW, type: 'correct', original: oW, note: 'alternate_spelling' });
      i++; j++;
      continue;
    }

    // 3. Same base word, differ in punctuation/case
    if (oClean === tClean) {
      const isCaseDiff = oW.toLowerCase() !== tW.toLowerCase();
      const oHasStop = hasFullStop(oW), tHasStop = hasFullStop(tW);

      if ((oHasStop && !tHasStop) || (!oHasStop && tHasStop)) {
        if (r.punctRule !== 'Ignore') {
          r.punctRule === 'Full Mistake' ? addFull() : addHalf();
          resultHtmlArray.push({ word: tW, original: oW, type: 'punctuation', mistakeClass: r.punctRule === 'Full Mistake' ? 'full' : 'half' });
        } else {
          resultHtmlArray.push({ word: tW, original: oW, type: 'correct' });
        }
      } else if (isCaseDiff) {
        if (r.capRule !== 'Ignore') {
          r.capRule === 'Full Mistake' ? addFull() : addHalf();
          resultHtmlArray.push({ word: tW, original: oW, type: 'capitalization', mistakeClass: r.capRule === 'Full Mistake' ? 'full' : 'half' });
        } else {
          resultHtmlArray.push({ word: tW, original: oW, type: 'correct' });
        }
      } else {
        resultHtmlArray.push({ word: tW, original: oW, type: 'correct' });
      }
      i++; j++;
      continue;
    }

    // 4. Singular/Plural
    if (isSingularPluralVariant(oClean, tClean)) {
      addHalf();
      resultHtmlArray.push({ word: tW, original: oW, type: 'singular_plural', mistakeClass: 'half' });
      i++; j++;
      continue;
    }

    // 5. Spelling (Levenshtein)
    const dist = levenshtein(oClean, tClean);
    const maxLen = Math.max(oClean.length, tClean.length);
    if (dist <= 2 && maxLen >= 3 && (dist / maxLen) <= 0.4 && !isAbbreviationMistake(oClean, tClean)) {
      r.similarWordRule === 'Strict' ? addFull() : addHalf();
      resultHtmlArray.push({ word: tW, original: oW, type: 'spelling', mistakeClass: r.similarWordRule === 'Strict' ? 'full' : 'half' });
      i++; j++;
      continue;
    }

    // 6. Omission (typed word matches orig word ahead)
    let omissionFound = false;
    for (let skip = 1; skip <= 2; skip++) {
      if (i + skip < origWords.length && stripPunct(origWords[i + skip]).toLowerCase() === tClean) {
        for (let s = 0; s < skip; s++) {
          addFull();
          resultHtmlArray.push({ word: origWords[i + s], original: origWords[i + s], type: 'missing', mistakeClass: 'full' });
        }
        i += skip;
        omissionFound = true;
        break;
      }
    }
    if (omissionFound) continue;

    // 7. Addition (orig word matched ahead in typed)
    let additionFound = false;
    for (let skip = 1; skip <= 2; skip++) {
      if (j + skip < typedWords.length && stripPunct(typedWords[j + skip]).toLowerCase() === oClean) {
        for (let s = 0; s < skip; s++) {
          addFull();
          resultHtmlArray.push({ word: typedWords[j + s], original: '', type: 'extra', mistakeClass: 'full' });
        }
        j += skip;
        additionFound = true;
        break;
      }
    }
    if (additionFound) continue;

    // 8. Repetition
    if (j > 0 && tClean === stripPunct(typedWords[j - 1]).toLowerCase()) {
      addFull();
      resultHtmlArray.push({ word: tW, original: oW, type: 'repetition', mistakeClass: 'full' });
      j++;
      continue;
    }

    // 9. Abbreviation mistake
    if (isAbbreviationMistake(oClean, tClean)) {
      addFull();
      resultHtmlArray.push({ word: tW, original: oW, type: 'abbreviation', mistakeClass: 'full' });
      i++; j++;
      continue;
    }

    // 10. SUBSTITUTION (completely different word)
    // SSC Rule: 2 FULL mistakes total:
    //   → 1 Full for correct word OMITTED
    //   → 1 Full for wrong word ADDED
    addFull();  // missing correct word
    resultHtmlArray.push({ word: oW, original: oW, type: 'missing', mistakeClass: 'full', note: 'substitution_missing' });
    addFull();  // extra wrong word typed
    resultHtmlArray.push({ word: tW, original: oW, type: 'substitution_extra', mistakeClass: 'full', note: 'substitution_extra' });
    i++; j++;
  }

  while (i < origWords.length) {
    addFull();
    resultHtmlArray.push({ word: origWords[i], original: origWords[i], type: 'missing', mistakeClass: 'full' });
    i++;
  }
  while (j < typedWords.length) {
    addFull();
    resultHtmlArray.push({ word: typedWords[j], original: '', type: 'extra', mistakeClass: 'full' });
    j++;
  }

  const totalPassageWords = origWords.length;
  const totalTypedWords   = typedWords.length;
  const errorUnits        = full + half * 0.5;

  let errorPercent = totalPassageWords > 0 ? (errorUnits * 100) / totalPassageWords : 0;
  if (errorPercent > 100) errorPercent = 100;
  const accuracy = Math.max(0, 100 - errorPercent);

  const typedChars = typedText.replace(/\s+/g, ' ').trim().length;
  const grossWpm = timeTakenMinutes > 0 ? (typedChars / 5) / timeTakenMinutes : 0;
  const netWpm = Math.max(0, Math.round(grossWpm - (errorUnits / Math.max(timeTakenMinutes, 1))));

  return {
    totalWords:      totalPassageWords,
    typedWords:      totalTypedWords,
    fullMistakes:    full,
    halfMistakes:    half,
    errorUnits:      +errorUnits.toFixed(2),
    totalMistakes:   +errorUnits.toFixed(2),
    errorPercent:    +errorPercent.toFixed(2),
    accuracy:        +accuracy.toFixed(2),
    wpm:             netWpm,
    visualHTML:      resultHtmlArray,
    allCapsDetected: allCapsTyped,
  };
}
