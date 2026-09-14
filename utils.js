import * as THREE from 'three';

const axis_x = new THREE.Vector3(1, 0, 0);
const angle_x = -Math.PI/2;
const axis_z = new THREE.Vector3(0, 0, 1);
const angle_z = Math.PI/2-1.131;

export function interpolatePosition(positions, time, interval) {
    const step = time * interval;
    const stepId = Math.floor(step);

    const start = positions[stepId];
    const target = positions[stepId + 1];
    const t = step - stepId;

    let newPosition = [];

    newPosition[0] = start[0] + (target[0] - start[0]) * t;
    newPosition[1] = start[1] + (target[1] - start[1]) * t;
    newPosition[2] = start[2] + (target[2] - start[2]) * t;

    const vector = arrayToRotatedVector(newPosition);

    return {position: vector, stepId};
}

export function arrayToRotatedVector(array) {
    const vector = new THREE.Vector3().fromArray(array);

    vector.applyAxisAngle(axis_x, angle_x);
    vector.applyAxisAngle(axis_z, angle_z);

    return vector;
}

export async function getData(url) {
    try {
        let request;
        if (window.location.hostname === 'mden-mt.github.io') {
            request = {};
        } else {
            const apiKey = await getAPIKey();
            request = {
                headers: {
                    'x-api-key': apiKey,
                }
            };
        }

        const response = await fetch(url, request);
        const data = await response;
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