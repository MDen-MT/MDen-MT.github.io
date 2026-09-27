import {getData} from './utils.js';
import {changeLightMode, changeMoonSize} from "./webGL.js";

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function updateMartianClock() {
    const now = new Date();
    const elapsedTime = now - J2000;
    const d = elapsedTime / (86400000);
    const msd = (((d - 4.5) / 1.027491252) + 44796.0 - 0.00018);

    const totalSeconds = msd % 1 * 86400;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = (num) => String(num).padStart(2, '0');

    document.getElementById('martian-clock').textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

}

setInterval(updateMartianClock, 1000);
updateMartianClock();


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


async function getContributions() {
    const url = 'https://github.com/users/MDen-MT/contributions';
    const proxyUrl = `https://jpl-proxy.mden.workers.dev/?targetUrl=${encodeURIComponent(url)}`;

    let data = await getData(proxyUrl);
    const htmlString = await data.text();

    const doc = parseStringToDoc(htmlString);

    Array.from(doc.getElementsByClassName('ContributionCalendar-label')).forEach(el => el.remove());
    Array.from(doc.getElementsByClassName('sr-only')).forEach(el => el.remove());
    Array.from(doc.getElementsByTagName('thead')).forEach(el => el.remove());

    const tbody = doc.getElementsByTagName('table').item(0);

    document.getElementById('contributions-right').append(tbody);


    const now = new Date();
    const month = now.getMonth();

    const monthsDiv = document.getElementsByClassName('months').item(0)

    for (let i = 0; i <= months.length; i++) {
        const month_span = document.createElement("span");
        month_span.className = 'small-text neon-white';
        month_span.textContent = months.at((month + i) % 12);
        monthsDiv.appendChild(month_span);
    }
}

function parseStringToDoc(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc;
}

getContributions();


const buttons = document.querySelectorAll('.button-polygon');
const infoBox = document.getElementById('button-info-box');
const infoText = document.getElementById('button-info-text');

const buttonDescriptions = [
    'Toggle Light Mods',
    'Adjust the Scale of Moons',
    'Toggle User Interface'
]

let lightMode = 0;
let showMoonSizeWindow = false;
let UIIsHidden = false;

let hoverTime;

buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
        if (!showMoonSizeWindow) {
            hoverTime = setTimeout(() => {
                infoBox.classList.remove('hidden');
                infoText.parentElement.classList.remove('hidden');
                const buttonId = parseInt(button.id.split('-').at(1));
                infoText.textContent = buttonDescriptions.at(buttonId - 1);
            }, 500);
        }
    })
})

buttons.forEach(button => {
    button.addEventListener('mouseleave', () => {
        clearTimeout(hoverTime);
        infoBox.classList.add('hidden');
        infoText.textContent = '';
        infoText.parentElement.classList.add('hidden');
    })
})

function hideShowUIButton() {
    document.getElementsByClassName('show-ui').item(0).classList.add('fade-out');
}

buttons.forEach(button => {
    button.addEventListener('click', (event) => {
        const buttonId = parseInt(button.id.split('-').at(1)) - 1;
        if (buttonId === 0) {
            lightMode = (lightMode + 1) % 3;
            changeLightMode(lightMode);
            const circleFill = document.querySelectorAll(".circle-fill");
            if (lightMode === 0) {
                circleFill.forEach(element => element.classList.add('hidden'));
                circleFill.forEach(element => element.classList.add('transparent'));
            } else if (lightMode === 1) {
                circleFill.forEach(element => element.classList.remove('hidden'));
                circleFill.forEach(element => element.classList.add('transparent'));
            } else if (lightMode === 2) {
                circleFill.forEach(element => element.classList.remove('hidden'));
                circleFill.forEach(element => element.classList.remove('transparent'));
            }
        } else if (buttonId === 1) {
            if (showMoonSizeWindow) {
                document.getElementById("moon-scale-window").classList.add('hidden');
                document.getElementById("moon-scale-content").classList.add('hidden');
                button.classList.remove('active');
                showMoonSizeWindow = false;
            } else {
                showMoonSizeWindow = true;

                clearTimeout(hoverTime);
                button.classList.add('active');
                infoBox.classList.add('hidden');
                infoText.textContent = '';
                infoText.parentElement.classList.add('hidden');

                document.getElementById("moon-scale-window").classList.remove('hidden');
                document.getElementById("moon-scale-content").classList.remove('hidden');
            }
        } else if (buttonId === 2) {
            UIIsHidden = true;
            document.getElementsByClassName('wrapper').item(0).classList.add('hidden');
            document.getElementsByClassName('show-ui').item(0).classList.remove('hidden');
            setTimeout(hideShowUIButton, 1000);
        }
    })
})

document.getElementById('show-ui').addEventListener('mouseenter', () => {
    document.getElementsByClassName('show-ui').item(0).classList.remove('fade-out');
})

document.getElementById('show-ui').addEventListener('mouseleave', () => {
    if (!document.getElementsByClassName('show-ui').item(0).classList.contains('hidden')) {
        hideShowUIButton();
    }
})

document.getElementById('show-ui').addEventListener('click', (event) => {
    document.getElementsByClassName('wrapper').item(0).classList.remove('hidden');
    document.getElementsByClassName('show-ui').item(0).classList.remove('fade-out');
    document.getElementsByClassName('show-ui').item(0).classList.add('hidden');
    UIIsHidden = false;
})


const moonScaleInput = document.getElementById('moon-scale');
const moonScaleRange = document.getElementById('moon-scale-range');

moonScaleInput.addEventListener('input', (event) => {
    const value = event.target.value;
    moonScaleRange.value = value;
    changeRails(value);
    changeMoonSize(value);
})

moonScaleRange.addEventListener('input', (event) => {
    const value = event.target.value;
    moonScaleInput.value = value;
    changeRails(value);
    changeMoonSize(value);
})

const leftRail = document.getElementById('left-rail');
const rightRail = document.getElementById('right-rail');

function changeRails(value) {
    if (!value) {
        value = 50;
    }
    value = Math.min(Math.max(value, 0), 100)
    leftRail.style.width = `calc(${407 / 100 * value - 5}px)`;
    rightRail.style.width = `calc(${407 / 100 * (100 - value) - 5}px)`;
}


document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (UIIsHidden) {
            UIIsHidden = false;
            document.getElementsByClassName('wrapper').item(0).classList.remove('hidden');
            document.getElementsByClassName('show-ui').item(0).classList.remove('fade-out');
            document.getElementsByClassName('show-ui').item(0).classList.add('hidden');
        } else if (showMoonSizeWindow) {
            const button = document.getElementById('button-2');
            document.getElementById("moon-scale-window").classList.add('hidden');
            document.getElementById("moon-scale-content").classList.add('hidden');
            button.classList.remove('active');
            showMoonSizeWindow = false;
        }
    }
})