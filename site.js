import {getData} from './utils.js';

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

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

}

function parseStringToDoc(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc;
}

setInterval(updateMartianClock, 1000);
updateMartianClock();
getContributions();