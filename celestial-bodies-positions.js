const url = 'https://ssd.jpl.nasa.gov/api/horizons.api';

const bodies = {
    'sun': {COMMAND: '10', STEP_SIZE: '24h'},
    'phobos': {COMMAND: '401', STEP_SIZE: '10m'},
    'deimos': {COMMAND: '402', STEP_SIZE: '10m'},
    'mars': {W0: 176.630, SPIN_RATE: 350.89198226, OFFSET: 42.14}
}

function getIsoTime(hoursAhead = 0) {
    const time = new Date(Date.now() + hoursAhead * 3600000);
    return time.toISOString().slice(0, 19).replace('T', '-');
}

export async function getPositions(body) {
    const params = {
        COMMAND: bodies[body].COMMAND,
        EPHEM_TYPE: 'VECTORS',
        MAKE_EPHEM: 'YES',
        CENTER: '500@499',
        START_TIME: getIsoTime(0),
        STOP_TIME: getIsoTime(24),
        STEP_SIZE: bodies[body].STEP_SIZE,
    }

    const queryString = new URLSearchParams(params).toString();
    const proxyUrl = `https://jpl-proxy.mden.workers.dev/?${queryString}`;

    let data = await getData(proxyUrl);
    let result = data.result;
    const timeData = result.split('$$SOE')[1].split('$$EOE')[0].split('\n');

    const positions = [];
    for (let i = 2; i < timeData.length; i += 4) {
        const positionArray = timeData[i].split(/ X\s*=*| Y\s*=*| Z\s*=/);
        positionArray.shift();
        positionArray.forEach((position, index) => {
            positionArray[index] = Number(position) / 3390;
        });
        positions.push(positionArray);
    }

    return positions;
}

async function getData(url) {
    try {
        let request;
        if (window.location.hostname === 'mden-mt.github.io') {
            request = {};
        } else {
            const apiKey = await getAPIKey();
            request = {headers: {
                    'x-api-key': apiKey,
                }};
        }

        const response = await fetch(url, request);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

async function getAPIKey() {
    try {
        const response = await fetch('secret.json');

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        const data = await response.json();

        return data['api-key'];
    } catch (error) {
        console.error(error);
    }
}

export function calculateMarsRotation(time) {
    const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

    const elapsedTime = time - J2000;
    const d = elapsedTime / (86400000);

    const T = d / 36525;
    const precessionTerm = 0.000117 * Math.pow(T, 2);

    let W = ((bodies.mars.W0 + bodies.mars.SPIN_RATE * d - precessionTerm) + bodies.mars.OFFSET) % 360;

    if (W < 0) {
        W += 360;
    }

    return W * Math.PI / 180;
}