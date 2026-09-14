const startTime = Date.now();

const phrases = [
    "Software Engineer",
    "Problem Solver",
    "Full Stack Developer",
]

let phraseId = 0;
let charId = 0;
let isDeleting = false;

const typedText = document.getElementById("typed-text");

function typeText() {
    const phrase = phrases[phraseId];
    if (!isDeleting) {
        charId++;
        typedText.textContent = phrase.slice(0, charId);
        if (charId === phrase.length) {
            isDeleting = true;
            setTimeout(typeText, 2000);
            return;
        }
        setTimeout(typeText, 70 + Math.random() * 30);
    } else {
        charId--;
        typedText.textContent = phrase.slice(0, charId);
        if (charId === 0) {
            isDeleting = false;
            phraseId = (phraseId + 1) % phrases.length;
            setTimeout(typeText, 400);
            return;
        }
        setTimeout(typeText, 25);
    }
}

typeText();