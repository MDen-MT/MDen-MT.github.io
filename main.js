import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {getPositions} from './celestial-bodies-positions.js';
import {interpolatePosition} from './utils.js';


const Interval1Hour = 1 / 86400000;
const Interval10Minutes = 1 / 600000;

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(0, 0, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 500;
controls.minDistance = 2;

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const AmbientLight = new THREE.AmbientLight(0xffffff, 0.005);
scene.add(AmbientLight);

const bodies = {
    sun: {interval: Interval1Hour, positions: [], isAwaiting: true, mesh: null, light: null},
    phobos: {interval: Interval10Minutes, positions: [], isAwaiting: true, mesh: null},
    deimos: {interval: Interval10Minutes, positions: [], isAwaiting: true, mesh: null},
    mars: {mesh: null},
}

async function getBodyPositions(body, isInitial = false) {
    bodies[body].isAwaiting = true;
    const newPositions = await getPositions(body);

    if (!isInitial) {
        newPositions.shift();
    }

    bodies[body].positions.push(...newPositions);
    bodies[body].isAwaiting = false;
}

async function init() {
    await getBodyPositions('sun', true);
    const sunGeometry = new THREE.SphereGeometry(207, 32, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({color: 0xffe100});

    bodies.sun.mesh = new THREE.Mesh(sunGeometry, sunMaterial);
    bodies.sun.light = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(bodies.sun.mesh, bodies.sun.light);

    const initialSunPos = new THREE.Vector3().fromArray(bodies.sun.positions[0])
    bodies.sun.mesh.position.copy(initialSunPos);
    bodies.sun.light.position.copy(initialSunPos);

    const [marsGltf, phobosGltf, deimosGltf] = await Promise.all([
        loader.loadAsync('./assets/mars.glb'),
        loader.loadAsync('./assets/phobos.glb'),
        loader.loadAsync('./assets/deimos.glb'),
    ])

    bodies.mars.mesh = marsGltf.scene;
    bodies.mars.mesh.scale.setScalar(0.002);
    bodies.mars.mesh.rotation.x = 1.131;
    scene.add(bodies.mars.mesh);

    await getBodyPositions('phobos', true);
    bodies.phobos.mesh = phobosGltf.scene;
    bodies.phobos.mesh.scale.setScalar(0.02);
    bodies.phobos.mesh.position.fromArray(bodies.phobos.positions[0]);
    scene.add(bodies.phobos.mesh);

    await getBodyPositions('deimos', true);
    bodies.deimos.mesh = deimosGltf.scene;
    bodies.deimos.mesh.scale.setScalar(0.02);
    bodies.deimos.mesh.position.fromArray(bodies.deimos.positions[0]);
    scene.add(bodies.deimos.mesh);

    renderer.setAnimationLoop(animate);
}

function animate(time) {
    bodies.mars.mesh.rotation.y = time / 5000;

    Object.entries(bodies).forEach(([name, body]) => {
        if (body.isAwaiting || name === "mars") return;

        const {position, stepId} = interpolatePosition(body.positions, time, body.interval);
        body.mesh.position.copy(position);

        if (name === "sun") {
            body.light.position.copy(position);
        }

        if (stepId + 2 >= body.positions.length) {
            getBodyPositions(name);
        }

    });

    controls.update();
    renderer.render(scene, camera);
}

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();