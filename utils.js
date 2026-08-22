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

    const vector = new THREE.Vector3().fromArray(newPosition);

    vector.applyAxisAngle(axis_x, angle_x);
    vector.applyAxisAngle(axis_z, angle_z);

    return {position: vector, stepId};
}