import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);
directionalLight.position.set(33888, 5000, 0);

const light = new THREE.AmbientLight(0xffffff, 0.005);
scene.add(light);

const sunGeometry = new THREE.SphereGeometry(207, 32, 16);
const sunMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);
sun.position.set(33888, 5000, 0);

// const marsGeometry = new THREE.SphereGeometry(1, 64, 32);
// const marsTexture = textureLoader.load('./assets/images/8k_mars.jpg');
// const marsMaterial = new THREE.MeshStandardMaterial({
//     map: marsTexture,
//     roughness: 0.8,
//     color: 0xffc2b3,
// });
// const mars = new THREE.Mesh(marsGeometry, marsMaterial);
// scene.add(mars);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let mars;
loader.load('./assets/mars.glb',
    function (gltf) {
        mars = gltf.scene;
        scene.add(mars);
    });

function animate(time) {
    if (mars) {
        mars.rotation.y = time / 5000;
    }

    renderer.render(scene, camera);
    const radius = 2;
    let deg = 30;
    let rad = deg * Math.PI / 180;
    let cos = Math.cos(rad);
    let sin = Math.sin(rad);
    let z;
    if (cos === 0) {
        z = 0;
    } else {
        z = radius * cos;
    }
    let x;
    if (sin === 0) {
        x = 0;
    } else {
        x = radius * sin;
    }
    camera.rotation.y = rad;
    camera.position.z = z;
    camera.position.x = x;
}

renderer.setAnimationLoop(animate);