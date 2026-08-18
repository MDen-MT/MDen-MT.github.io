const url = 'https://ssd.jpl.nasa.gov/api/horizons.api';

const bodies = {
    'sun': {command: '10', stepSize: '24h'},
    'phobos': {command: '401', stepSize: '10m'},
    'deimos': {command: '402', stepSize: '10m'},
}

function getIsoTime(hoursAhead = 0) {
    const time = new Date(Date.now() + hoursAhead*3600000);
    return time.toISOString().slice(0, 19).replace('T', '-');
}

export async function getPositions(body) {
    const params = {
        COMMAND: bodies[body].command,
        EPHEM_TYPE: 'VECTORS',
        MAKE_EPHEM: 'YES',
        CENTER: '500@499',
        START_TIME: getIsoTime(0),
        STOP_TIME: getIsoTime(24),
        STEP_SIZE: bodies[body].stepSize,
    }

    const queryString = new URLSearchParams(params).toString();
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(`${url}?${queryString}`);

    let data = await getData(proxyUrl);
    let result = data.result;
    const timeData = result.split('$$SOE')[1].split('$$EOE')[0].split('\n');

    const positions = [];
    for (let i = 2; i < timeData.length; i+=4) {
        const positionArray = timeData[i].split(/ X\s*=*| Y\s*=*| Z\s*=/);
        positionArray.shift();
        positionArray.forEach((position, index) => {
            positionArray[index] = Number(position)/3390;
        });
        positions.push(positionArray);
    }

    return positions;
}

async function getData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}