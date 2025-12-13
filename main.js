import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 100, 500);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// Physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

// Ground
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(250, 0.1, 250)),
});
world.addBody(groundBody);

// Simple track barriers (walls)
function createWall(posX, posZ, width, depth) {
    const wallGeo = new THREE.BoxGeometry(width, 5, depth);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(posX, 2.5, posZ);
    wallMesh.castShadow = true;
    scene.add(wallMesh);

    const wallBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, 2.5, depth / 2)),
        position: new CANNON.Vec3(posX, 2.5, posZ),
    });
    world.addBody(wallBody);
}

// Create a basic oval track
for (let i = -100; i <= 100; i += 20) {
    createWall(100, i, 10, 10);
    createWall(-100, i, 10, 10);
}
for (let i = -80; i <= 80; i += 20) {
    createWall(i, 100, 10, 10);
    createWall(i, -100, 10, 10);
}

// Car physics
let carBody;
let carMesh;
const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
carBody = new CANNON.Body({ mass: 150 });
carBody.addShape(chassisShape);
carBody.position.set(0, 5, 0);
world.addBody(carBody);

const loader = new GLTFLoader();
loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Ferrari.glb', (gltf) => {
    carMesh = gltf.scene;
    carMesh.scale.set(0.01, 0.01, 0.01); // Ferrari model is huge
    carMesh.rotation.y = Math.PI; // Face forward
    scene.add(carMesh);
});

// Vehicle
const vehicle = new CANNON.RaycastVehicle({
    chassisBody: carBody,
});
const wheelOptions = { radius: 0.5, directionLocal: new CANNON.Vec3(0, -1, 0), axleLocal: new CANNON.Vec3(1, 0, 0), suspensionStiffness: 30, suspensionRestLength: 0.3, frictionSlip: 5, dampingRelaxation: 2.3, dampingCompression: 4.4 };
vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(1, 0, 1) });
vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(1, 0, -1) });
vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1) });
vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, -1) });
vehicle.addToWorld(world);

// Cockpit camera position (inside the car)
camera.position.set(0, 1.2, 0.5); // Slightly above and forward from center

// Controls
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

const maxForce = 500;
const maxSteer = 0.5;

// HUD
const hud = document.getElementById('hud');

function animate() {
    requestAnimationFrame(animate);

    const dt = 1 / 60;
    world.step(dt);

    // Controls
    vehicle.applyEngineForce(keys['s'] || keys['arrowdown'] ? maxForce : (keys['w'] || keys['arrowup'] ? -maxForce : 0), 2);
    vehicle.applyEngineForce(keys['s'] || keys['arrowdown'] ? maxForce : (keys['w'] || keys['arrowup'] ? -maxForce : 0), 3);

    vehicle.setSteeringValue(keys['a'] || keys['arrowleft'] ? maxSteer : (keys['d'] || keys['arrowright'] ? -maxSteer : 0), 0);
    vehicle.setSteeringValue(keys['a'] || keys['arrowleft'] ? maxSteer : (keys['d'] || keys['arrowright'] ? -maxSteer : 0), 1);

    // Update car mesh
    if (carMesh) {
        carMesh.position.copy(carBody.position);
        carMesh.quaternion.copy(carBody.quaternion);
    }

    // Attach camera to car (cockpit view)
    camera.position.copy(carBody.position).add(new THREE.Vector3(0, 1.2, 0.5).applyQuaternion(carBody.quaternion));
    camera.quaternion.copy(carBody.quaternion);

    // Speed HUD
    const speed = Math.round(carBody.velocity.length() * 3.6); // m/s to km/h
    hud.textContent = `Speed: ${speed} km/h`;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
