import * as THREE from 'three';

export function interpolatePosition(positions, time, interval) {

    const step = time*interval;
    const stepId = Math.floor(step);


    const start = positions[stepId];
    const target = positions[stepId + 1];
    const t = step - stepId;

    let newPosition = [];

    newPosition[0] = start[0] + (target[0] - start[0]) * t;
    newPosition[1] = start[1] + (target[1] - start[1]) * t;
    newPosition[2] = start[2] + (target[2] - start[2]) * t;

    const vector = new THREE.Vector3().fromArray(newPosition);

    console.log(vector);

    return {position: vector, stepId};
}