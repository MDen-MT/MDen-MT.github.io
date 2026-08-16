const url = 'https://ssd.jpl.nasa.gov/api/horizons.api';

export async function getSunPosition() {
    const start = getTime();
    const end = getTime(1);
    const params = {
        COMMAND: '10',
        EPHEM_TYPE: 'VECTORS',
        MAKE_EPHEM: 'YES',
        CENTER: '500@499',
        START_TIME: start,
        STOP_TIME: end,
        STEP_SIZE: '1d'
    }
    const queryString = new URLSearchParams(params).toString();

    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(`${url}?${queryString}`);

    let data = await getData(proxyUrl);
    let result = data.result;
    let position = getPosition(result);

    return position;
}

function getPosition(data) {
    const timeData = data.split('$$SOE')[1].split('$$EOE')[0];
    const position = timeData.split('\n')[2].split(/ X\s*=*| Y\s*=*| Z\s*=/);
    const x = Number(position[1]);
    const y = Number(position[2]);
    const z = Number(position[3]);
    return {x, y, z}
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

function getTime(hoursAfter = 0) {
    const time = new Date();
    time.setHours(time.getHours() + hoursAfter);

    const year = time.getUTCFullYear();
    const month = time.getUTCMonth() + 1;
    const day = time.getUTCDate();
    const hour = time.getUTCHours();
    const minute = time.getUTCMinutes();
    const second = time.getUTCSeconds();

    return `${year}-${month}-${day}-${hour}:${minute}:${second}`;
}