// =======================
// WORD SPLIT
// =======================
export function getWords(text, punctRule) {
  let processed = text;
  if(punctRule === "Ignore") {
    // Standard punctuation strip
    processed = processed.replace(/[.,:;!?]/g, "");
  } else {
    // Detach punctuation to treat them as independent checks or leave them attached.
    // Leaving them attached means if a user typed "Hello," but original was "Hello", it's a mistake.
    // We will leave them attached if punctRule is anything but Ignore.
  }
  
  return processed
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(w => w.length > 0);
}

// =======================
// SPELLING CHECK (Levenshtein based off original logic)
// =======================
export function isSpelling(a, b) {
  let diff = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) diff++;
  }
  diff += Math.abs(a.length - b.length);
  return diff === 1;
}

// =======================
// ENGINE ANALYZER
// =======================
export function analyzeTestResult(originalText, typedText, timeTakenMinutes, rules) {
  // Default rules payload fallback
  const r = {
    capRule: rules?.capRule || "Ignore",
    punctRule: rules?.punctRule || "Ignore",
    similarWordRule: rules?.similarWordRule || "Strict"
  };

  // Normalize labels (e.g. from "Allow (Half Mistake)" to "Half Mistake")
  if (r.similarWordRule.includes("Half Mistake")) r.similarWordRule = "Half Mistake";
  if (r.similarWordRule.includes("Strict")) r.similarWordRule = "Strict";

  const oRaw = getWords(originalText, r.punctRule);
  const tRaw = getWords(typedText, r.punctRule);

  let i = 0, j = 0;
  let full = 0, half = 0;
  
  let resultHtmlArray = [];

  while (i < oRaw.length && j < tRaw.length) {
    let owR = oRaw[i];
    let twR = tRaw[j];
    
    // Lowercase copies for testing
    let owLow = owR.toLowerCase();
    let twLow = twR.toLowerCase();

    // 1. EXACT MATCH DIRECTLY (Including Case & Punctuation)
    if (owR === twR) {
      resultHtmlArray.push({ word: twR, type: "correct" });
      i++; j++;
      continue;
    }

    // 2. SAME WORD, DIFFERENT CASE OR PUNCTUATION
    const owClean = owLow.replace(/[.,:;!?]/g, "");
    const twClean = twLow.replace(/[.,:;!?]/g, "");
    
    if (owLow === twLow || owClean === twClean) {
      let isCaseDiff = (owR !== twR) && (owLow === twLow);
      let isPunctDiff = owLow !== twLow; 
      
      let mistakeType = "correct";

      if (isCaseDiff) {
        if (r.capRule !== "Ignore") {
          full += (r.capRule === "Full Mistake" ? 1 : 0.5);
          mistakeType = "capitalization";
        }
      }

      if (isPunctDiff && mistakeType === "correct") { // Capitalization takes priority for tagging if both exist
        if (r.punctRule !== "Ignore") {
          full += (r.punctRule === "Full Mistake" ? 1 : 0.5);
          mistakeType = "punctuation";
        }
      }

      resultHtmlArray.push({ word: twR, original: owR, type: mistakeType });
      i++; j++;
      continue;
    }

    // 3. SPELLING (1 char diff)
    if (isSpelling(owLow, twLow)) {
      let weight = r.similarWordRule === "Strict" ? 1 : 0.5;
      full += weight;
      resultHtmlArray.push({ word: twR, original: owR, type: "spelling" });
      i++; j++;
      continue;
    }

    // 4. MISSING WORD (Omission)
    if (oRaw[i + 1] && (oRaw[i + 1].toLowerCase() === twLow || oRaw[i + 1].toLowerCase().replace(/[.,:;!?]/g, "") === twClean)) {
      full++;
      resultHtmlArray.push({ word: owR, type: "missing" });
      i++;
      continue;
    }

    // 5. EXTRA WORD (Addition)
    if (tRaw[j + 1] && (oRaw[i].toLowerCase() === tRaw[j + 1].toLowerCase() || owClean === tRaw[j+1].toLowerCase().replace(/[.,:;!?]/g, ""))) {
      full++;
      resultHtmlArray.push({ word: twR, type: "extra" });
      j++;
      continue;
    }

    // 6. COMPLETELY DIFFERENT WORD (Substitution)
    full++;
    resultHtmlArray.push({ word: twR, original: owR, type: "substitution" });
    i++; j++;
  }

  // remaining original (missed)
  while (i < oRaw.length) {
    full++;
    resultHtmlArray.push({ word: oRaw[i], type: "missing" });
    i++;
  }

  // remaining typed (extra)
  while (j < tRaw.length) {
    full++;
    resultHtmlArray.push({ word: tRaw[j], type: "extra" });
    j++;
  }

  const totalWords = oRaw.length;
  const typedCount = tRaw.length;
  const totalMistakes = full + (half * 0.5);
  
  const typedCharacters = typedText.replace(/\s+/g, " ").trim().length;
  let rawWpm = timeTakenMinutes > 0 ? ((typedCharacters / 5) / timeTakenMinutes) : 0;
  
  let errorRate = (totalMistakes / totalWords) * 100;
  if (errorRate > 100) errorRate = 100;
  
  let accuracy = 100 - errorRate;
  if (accuracy < 0) accuracy = 0;

  let netWpm = Math.max(0, Math.round(rawWpm - (totalMistakes / timeTakenMinutes)));

  return {
    totalWords,
    typedWords: typedCount,
    fullMistakes: full,
    halfMistakes: half,
    totalMistakes,
    errorPercent: errorRate.toFixed(2),
    accuracy: accuracy.toFixed(2),
    wpm: netWpm,
    visualHTML: resultHtmlArray
  };
}
