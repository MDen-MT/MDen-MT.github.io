import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

import {getPositions, calculateMarsRotation} from './celestial-bodies-positions.js';
import {arrayToRotatedVector, interpolatePosition, isInsidePolygon} from './utils.js';
import {updateProgressBar, yieldToBrowser} from './progress-bar.js';

const interval1Hour = 1 / 86400000;
const interval10Minutes = 1 / 600000;

const sizeFactor = 0.002;

const startTime = Date.now();

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(5, 0, 0);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0.1, 0);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 500;
controls.minDistance = 2;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.1;

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const ambientLight = new THREE.AmbientLight(0xffc2b3, 0.003);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffc2b3, 0.3);
spotLight.position.set(0, 0, 0);
spotLight.angle = Math.PI / 1.5;
spotLight.decay = 0;
scene.add(spotLight);
scene.add(spotLight.target)

let projectCount = 0;
let currentProject = 0;
let previousProject = 0;
let projectAngle = 0;

let animatingCamera = false;
let animatingStartTime = -1;
let animatingDirection = 0;
const animationLength = 500;

const bodies = {
    sun: {interval: interval1Hour, positions: [], isAwaiting: true, mesh: null, light: null, sky: null},
    phobos: {interval: interval10Minutes, positions: [], isAwaiting: true, mesh: null},
    deimos: {interval: interval10Minutes, positions: [], isAwaiting: true, mesh: null},
    mars: {mesh: null},
}

let project_cards = [];

const link_polygon = [[0.522, 0.049], [0.494, 0.001], [0.72, 0.001], [0.748, 0.049]];
const source_polygon = [[0.753, 0.049], [0.725, 0.001], [0.951, 0.001], [0.979, 0.049]];

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
    updateProgressBar('Loading models');
    const [phobosGltf, deimosGltf] = await Promise.all([
        loader.loadAsync('./assets/models/phobos.glb')
            .then(model => {
                updateProgressBar();
                return model;
            }),

        loader.loadAsync('./assets/models/deimos.glb')
            .then(model => {
                updateProgressBar();
                return model;
            }),
    ]);

    updateProgressBar('Loading textures');
    const [marsSurfaceMap, marsNormalMap, skyMap] = await Promise.all([
        textureLoader.loadAsync('./assets/textures/Mars_8K_Surface.png')
            .then(texture => {
                updateProgressBar();
                return texture;
            }),

        textureLoader.loadAsync('./assets/textures/Mars_8K_Normal.png')
            .then(texture => {
                updateProgressBar();
                return texture;
            }),

        textureLoader.loadAsync('./assets/textures/starmap_g16k.jpg')
            .then(texture => {
                updateProgressBar();
                return texture;
            }),

    ])

    updateProgressBar('Placing Sun');
    await getBodyPositions('sun', true);
    const sunGeometry = new THREE.SphereGeometry(207, 32, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({color: 0xffe100});

    bodies.sun.mesh = new THREE.Mesh(sunGeometry, sunMaterial);
    bodies.sun.light = new THREE.DirectionalLight(0xffffff, 3);
    bodies.sun.light.castShadow = true;
    bodies.sun.light.shadow.mapSize.width = 4096;
    bodies.sun.light.shadow.mapSize.height = 4096;
    bodies.sun.light.shadow.bias = -0.0001;
    scene.add(bodies.sun.mesh, bodies.sun.light);

    const initialSunPos = arrayToRotatedVector(bodies.sun.positions[0].map(num => num / 1000));
    bodies.sun.mesh.position.copy(initialSunPos);
    bodies.sun.light.position.copy(initialSunPos);

    updateProgressBar('Placing stars');
    const skyGeometry = new THREE.SphereGeometry(100000, 64, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: skyMap,
        color: 0x292828,
        side: THREE.DoubleSide,
    });
    bodies.sun.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    bodies.sun.sky.position.copy(initialSunPos);
    bodies.sun.sky.lookAt(0, 0, 0);
    scene.add(bodies.sun.sky);

    updateProgressBar('Placing Mars');
    const marsGeometry = new THREE.SphereGeometry(1, 64, 32);
    const marsMaterial = new THREE.MeshStandardMaterial({
        map: marsSurfaceMap,
        normalMap: marsNormalMap,
        normalScale: new THREE.Vector2(5.0, 5.0),
        roughness: 0.8,
        color: 0xffc2b3,
    });

    bodies.mars.mesh = new THREE.Mesh(marsGeometry, marsMaterial);
    bodies.mars.mesh.castShadow = true;
    bodies.mars.mesh.receiveShadow = true;
    bodies.mars.mesh.rotation.y = calculateMarsRotation(startTime);
    scene.add(bodies.mars.mesh);

    updateProgressBar('Placing Phobos');
    await getBodyPositions('phobos', true);
    const initialPhobosPos = arrayToRotatedVector(bodies.phobos.positions[0]);
    bodies.phobos.mesh = phobosGltf.scene;
    bodies.phobos.mesh.scale.setScalar(0.01);
    bodies.phobos.mesh.position.copy(initialPhobosPos);
    bodies.phobos.mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    })
    scene.add(bodies.phobos.mesh);

    updateProgressBar('Placing Deimos');
    await getBodyPositions('deimos', true);
    const initialDeimosPos = arrayToRotatedVector(bodies.deimos.positions[0]);
    bodies.deimos.mesh = deimosGltf.scene;
    bodies.deimos.mesh.scale.setScalar(0.01);
    bodies.deimos.mesh.position.copy(initialDeimosPos);
    bodies.deimos.mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    })
    scene.add(bodies.deimos.mesh);

    updateProgressBar('Creating project cards');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(24, 12);
    ctx.lineTo(12, 24);
    ctx.lineTo(12, 696);
    ctx.lineTo(24, 708);
    ctx.lineTo(632, 708);
    ctx.lineTo(664, 676);
    ctx.lineTo(1256, 676);
    ctx.lineTo(1268, 664);
    ctx.lineTo(1268, 24);
    ctx.lineTo(1256, 12);
    ctx.closePath();

    ctx.fillStyle = '#E61E320C';
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#E61E32";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(668, 686);
    ctx.lineTo(636, 718);
    ctx.lineTo(921, 718);
    ctx.lineTo(953, 686);
    ctx.closePath();

    ctx.fillStyle = '#FFFFFF0C';
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(965, 686);
    ctx.lineTo(933, 718);
    ctx.lineTo(1218, 718);
    ctx.lineTo(1250, 686);
    ctx.closePath();

    ctx.fillStyle = '#FFFFFF0C';
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '24px "Orbitron Light", sans-serif';

    ctx.fillText('Link', 668, 710);
    ctx.fillText('Sources', 965, 710);

    const geometry = new THREE.PlaneGeometry(0.5, 0.28125);
    const material = new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        opacity: 1.0,
        alphaTest: 0.01,
        transparent: true,
        emissive: 0xE61E32,
        emissiveIntensity: 1,
    });

    const response = await fetch('projects.json');
    const data = await response.json();
    projectCount = data.length;
    projectAngle = 360 / projectCount;
    for (let i = 0; i < projectCount; i++) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = 1280;
        newCanvas.height = 720;
        const ctx_copy = newCanvas.getContext('2d');
        ctx_copy.drawImage(canvas, 0, 0);
        createProjectCard(data.at(i), i, ctx_copy, geometry, material.clone());
    }

    updateProgressBar('Rendering scene');
    await yieldToBrowser();
    renderer.render(scene, camera);
    updateProgressBar('done');
    renderer.setAnimationLoop(animate);
}

function createProjectCard(project, id, ctx, geometry, material) {
    const img_texture = textureLoader.load('./assets/images/' + project.image, function (loadedTexture) {
        const canvas = ctx.canvas;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px "Orbitron ExtraBold", sans-serif';
        ctx.fillText(project.title, 652, 72);

        ctx.fillStyle = '#FFFFFF'
        ctx.font = '24px "Orbitron Light", sans-serif';

        const descriptionParagraphs = project.description.split('\n');
        let lineId = 0;
        for (let paragraphId = 0; paragraphId < descriptionParagraphs.length; paragraphId++) {
            const descriptionWords = descriptionParagraphs.at(paragraphId).split(' ');
            let lineText = descriptionWords.at(0);
            for (let wordId = 1; wordId < descriptionWords.length; wordId++) {
                const testLineText = lineText + ' ' + descriptionWords.at(wordId);
                if (ctx.measureText(testLineText).width >= 600) {
                    ctx.fillText(lineText, 652, 108 + 30 * lineId);
                    lineText = descriptionWords[wordId];
                    lineId++;
                } else {
                    lineText = testLineText;
                }
            }
            ctx.fillText(lineText, 652, 108 + 30 * lineId);
            lineId++;
        }

        ctx.fillText('Publication Date: ' + project.publication_date, 36, 684);

        const texture = new THREE.CanvasTexture(canvas);
        material.map = texture;

        const radius = 1.75;
        const angle = projectAngle * id;
        const rad = angle * Math.PI / 180;
        const x = radius * Math.cos(rad);
        const z = radius * Math.sin(rad);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0, z);
        mesh.rotateY(Math.PI / 2 - rad);
        scene.add(mesh);
        mesh.visible = false;

        const img_width = img_texture.image.width;
        const img_height = img_texture.image.height;
        const img_ratio = img_width / img_height;
        const img_geometry = new THREE.PlaneGeometry(0.2375, 0.2375 / img_ratio);

        const img_material = new THREE.MeshBasicMaterial({
            map: img_texture,
            side: THREE.DoubleSide,
        });

        const img_x = (radius + 0.001) * Math.cos(rad);
        const img_z = (radius + 0.001) * Math.sin(rad);
        const img_mesh = new THREE.Mesh(img_geometry, img_material);
        img_mesh.position.set(img_x, 0.13 - 0.2375 / img_ratio / 2, img_z);
        img_mesh.rotateY(Math.PI / 2 - rad);
        img_mesh.translateX(-0.12)
        scene.add(img_mesh);
        img_mesh.visible = false;

        project_cards.push({
            mesh: mesh,
            img: img_mesh,
            project: project,
        });
    });
}

function animate(time) {
    bodies.mars.mesh.rotation.y = calculateMarsRotation(startTime + time);

    Object.entries(bodies).forEach(([name, body]) => {
        if (body.isAwaiting || name === "mars") return;

        const {position, stepId} = interpolatePosition(body.positions, time, body.interval);
        body.mesh.position.copy(position);

        if (name === "sun") {
            body.light.position.copy(position.divideScalar(1000));
            spotLight.target.position.copy(position);

            body.sky.lookAt(0, 0, 0);
        }

        if (stepId + 2 >= body.positions.length) {
            getBodyPositions(name);
        }

        body.mesh.lookAt(0, 0, 0);
    });

    if (animatingCamera) {
        if (animatingStartTime === -1) {
            animatingStartTime = time;
        } else if (time >= animatingStartTime + animationLength) {
            animatingStartTime = -1;
            animatingCamera = false;
            moveCameraToProject();
        } else {
            const radius = camera.position.length();
            const angle = projectAngle * (previousProject + (time - animatingStartTime) / animationLength * animatingDirection);
            const rad = angle * Math.PI / 180;
            const x = radius * Math.cos(rad);
            const z = radius * Math.sin(rad);
            camera.position.set(x, 0, z);
        }
    }

    controls.update();
    composer.render(scene, camera);
}

export function changeLightMode(lightMode) {
    if (lightMode === 0) {
        ambientLight.intensity = 0.003;
        spotLight.intensity = 0.3;
        bodies.sun.light.intensity = 3;
    } else if (lightMode === 1) {
        ambientLight.intensity = 0.1;
        spotLight.intensity = 0.3;
        bodies.sun.light.intensity = 3;
    } else if (lightMode === 2) {
        ambientLight.intensity = 2;
        spotLight.intensity = 0;
        bodies.sun.light.intensity = 0;
    }
}

export function changeMoonSize(size) {
    if (size) {
        bodies.deimos.mesh.scale.setScalar(size * sizeFactor);
        bodies.phobos.mesh.scale.setScalar(size * sizeFactor);
    }
}

export function showProjects() {
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.update();
    camera.position.set(2, 0, 0);
    project_cards.forEach(project => {
        project.mesh.visible = true;
        project.img.visible = true;
    })
    moveCameraToProject();
}

export function hideProjects() {
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.update();
    camera.position.set(5, 0, 0);
    project_cards.forEach(project => {
        project.mesh.visible = false;
        project.img.visible = false;
    })
}

export function changeProject(direction) {
    if (animatingCamera === false) {
        previousProject = currentProject;
        currentProject = (currentProject + direction) % projectCount;
        if (currentProject < 0) {
            currentProject = projectCount - 1;
        }
        animatingCamera = true;
        animatingDirection = direction;
    }
}

function moveCameraToProject() {
    const radius = camera.position.length();
    const angle = projectAngle * currentProject;
    const rad = angle * Math.PI / 180;
    const x = radius * Math.cos(rad);
    const z = radius * Math.sin(rad);
    camera.position.set(x, 0, z);
}

renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / window.innerWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const cards = project_cards.map(card => card.mesh);
    const projects = project_cards.map(card => card.project);
    const intersects = raycaster.intersectObjects(cards, true);
    if (intersects.length > 0) {
        const firstHit = intersects[0];
        const object = firstHit.object;
        const project = projects[cards.indexOf(object)];
        if (object.visible) {
            const [x, y] = firstHit.uv;
            if (isInsidePolygon(x, y, link_polygon)) {
                window.open(project.link, "_blank").focus();
            } else if (isInsidePolygon(x, y, source_polygon)) {
                window.open(project.source_link, "_blank").focus();
            }
        }
    }
})

export function changeCanvasRatio() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();