let activeTest = JSON.parse(localStorage.getItem("activeTest"));

let passage = activeTest.passage;
let totalTime = activeTest.time;
let settings = activeTest.settings;

let timeLeft = totalTime * 60;
let timer;

// =======================
// SAFE WORD SPLIT
// =======================

function getWords(text){
    return text
        .replace(/\s+/g," ")
        .trim()
        .split(" ")
        .filter(w => w.length > 0);
}

// =======================
// CLEAN WORD
// =======================

function clean(w){
    return w.toLowerCase().replace(/[.,!?]/g,"");
}

// =======================
// SPELLING CHECK
// =======================

function isSpelling(a,b){
    let diff=0;

    for(let i=0;i<Math.min(a.length,b.length);i++){
        if(a[i]!==b[i]) diff++;
    }

    diff += Math.abs(a.length-b.length);

    return diff === 1;
}

// =======================
// ENGINE (FIXED)
// =======================

function analyze(oRaw,tRaw){

    let o = oRaw.map(clean);
    let t = tRaw.map(clean);

    let i=0,j=0;

    let full=0, half=0;
    let html="";

    while(i < o.length && j < t.length){

        let ow=o[i];
        let tw=t[j];

        let owR=oRaw[i];
        let twR=tRaw[j];

        // EXACT
        if(ow === tw){

            if(owR !== twR){
                half++;
                html += box(twR,"half");
            } else {
                html += box(twR,"correct");
            }

            i++; j++;
        }

        // MISSING
        else if(o[i+1] === tw){

            full++;
            html += box("(missing:"+owR+")","full");

            i++;
        }

        // EXTRA
        else if(o[i] === t[j+1]){

            full++;
            html += box(twR,"full");

            j++;
        }

        // SPELLING
        else if(isSpelling(ow,tw)){

            half++;
            html += box(twR,"half");

            i++; j++;
        }

        // FULL
        else{

            full++;
            html += box(twR,"full");

            i++; j++;
        }
    }

    // REMAINING ORIGINAL
    while(i < o.length){
        full++;
        html += box("(missing:"+oRaw[i]+")","full");
        i++;
    }

    // REMAINING TYPED
    while(j < t.length){
        full++;
        html += box(tRaw[j],"full");
        j++;
    }

    return {full,half,html};
}

// =======================
// BOX UI
// =======================

function box(word,type){

    let color={
        correct:"#cbd5f5",
        half:"#facc15",
        full:"#ef4444"
    };

    return `<span style="padding:6px;margin:3px;background:${color[type]};border-radius:4px">${word}</span>`;
}

// =======================
// SUBMIT (FIXED)
// =======================

function submitTest(){

    clearInterval(timer);

    let typedText = document.getElementById("inputArea").value;

    let o = getWords(passage);
    let t = getWords(typedText);

    let res = analyze(o,t);

    let totalWords = o.length;

    let totalMistakes = res.full + (res.half * 0.5);

    let error = (totalMistakes / totalWords) * 100;
    let accuracy = 100 - error;

    showResult({
        totalWords,
        typedWords: t.length,
        fullMistakes: res.full,
        halfMistakes: res.half,
        errorPercent: error.toFixed(2),
        accuracy: accuracy.toFixed(2),
        html: res.html
    });
}

// =======================
// RESULT
// =======================

function showResult(d){

    let modal=document.getElementById("resultModal");
    let c=document.getElementById("resultContent");

    c.innerHTML=`
        <div>${d.html}</div>
        <hr>
        <p>Total Words: ${d.totalWords}</p>
        <p>Typed: ${d.typedWords}</p>
        <p>Full: ${d.fullMistakes}</p>
        <p>Half: ${d.halfMistakes}</p>
        <p>Error: ${d.errorPercent}%</p>
        <p>Accuracy: ${d.accuracy}%</p>
    `;

    modal.style.display="flex";
}

function closeResult(){
    document.getElementById("resultModal").style.display="none";
}

// =======================
// TIMER START
// =======================


function analyze(oRaw,tRaw){

    let o=oRaw.map(clean);
    let t=tRaw.map(clean);

    let i=0,j=0;
    let full=0, half=0;

    let html="";

    while(i<o.length && j<t.length){

        let ow=o[i];
        let tw=t[j];

        let owR=oRaw[i];
        let twR=tRaw[j];

        // EXACT
        if(ow === tw){

            if(owR !== twR){
                half++;
                html += box(twR,"half");
            } else {
                html += box(twR,"correct");
            }

            i++; j++;
        }

        // PLURAL / SINGULAR (IMPORTANT FIX)
        else if(ow+"s"===tw || ow===tw+"s"){

            half++;
            html += box(twR,"half");

            i++; j++;
        }

        // SPELLING
        else if(isSpelling(ow,tw)){

            half++;
            html += box(twR,"half");

            i++; j++;
        }

        // MISSING WORD (STRICT)
        else if(o[i+1] === tw){

            full++;
            html += box("(missing:"+owR+")","full");

            i++;
        }

        // EXTRA WORD
        else if(o[i] === t[j+1]){

            full++;
            html += box(twR,"full");

            j++;
        }

        // SHIFT CONTROL (NEW FIX 🔥)
        else{

            // treat as ONE full mistake only
            full++;
            html += box(twR,"full");

            i++; j++;
        }
    }

    // remaining original
    while(i < o.length){
        full++;
        html += box("(missing:"+oRaw[i]+")","full");
        i++;
    }

    // remaining typed
    while(j < t.length){
        full++;
        html += box(tRaw[j],"full");
        j++;
    }

    return {full,half,html};
}