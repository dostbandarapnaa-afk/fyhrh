let scene, camera, renderer;
let player, car;
let npcs = [], policeCars = [], bullets = [], droppedGuns = [];
let inventory = [];
let currentWeapon = null;
let inCar = false, gameStarted = false;

let wantedLevel = 0;
let crimesCommitted = 0;

let keys = { w: false, a: false, s: false, d: false };
let cameraAngleY = 0;
let carSpeed = 0, carRotation = 0, walkCycle = 0;

const gunTypes = ['Pistol', 'Shotgun', 'Rifle', 'SMG'];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    scene.fog = new THREE.FogExp2(0x111122, 0.008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfffaed, 1.2);
    sun.position.set(80, 120, 50);
    sun.castShadow = true;
    scene.add(sun);

    createCity();
    player = createPlayer();
    player.position.set(0, 0, 5);
    scene.add(player);

    car = createCar(0xff0000);
    car.position.set(6, 0, 0);
    scene.add(car);

    for (let i = 0; i < 10; i++) spawnNPC();

    setupEvents();
    animate();
}

function addCrime() {
    crimesCommitted++;
    wantedLevel = Math.min(5, Math.floor(crimesCommitted / 2) + 1);
    let starsStr = "★".repeat(wantedLevel) + "☆".repeat(5 - wantedLevel);
    document.getElementById('wanted-stars').innerText = starsStr;

    if (wantedLevel > 0 && policeCars.length < wantedLevel) {
        spawnPoliceCar();
    }
}

function createPlayer() {
    const group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), new THREE.MeshStandardMaterial({ color: 0x1a237e }));
    torso.position.y = 1.0;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    head.position.y = 1.65;
    group.add(head);

    const limMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), limMat);
    leftLeg.position.set(-0.15, 0.38, 0);
    leftLeg.name = "leftLeg";
    
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), limMat);
    rightLeg.position.set(0.15, 0.38, 0);
    rightLeg.name = "rightLeg";

    group.add(leftLeg, rightLeg);
    return group;
}

function createCar(colorHex, isPolice = false) {
    const carGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.7, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 4.2), bodyMat);
    body.position.y = 0.5;
    carGroup.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    cabin.position.set(0, 1.0, -0.2);
    carGroup.add(cabin);

    if (isPolice) {
        const siren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        siren.position.set(0, 1.45, -0.2);
        siren.name = "siren";
        carGroup.add(siren);
    }
    return carGroup;
}

function spawnPoliceCar() {
    const pCar = createCar(0x000000, true);
    pCar.position.set(player.position.x + (Math.random() > 0.5 ? 40 : -40), 0, player.position.z + (Math.random() > 0.5 ? 40 : -40));
    pCar.userData = { speed: 0.22 };
    policeCars.push(pCar);
    scene.add(pCar);
}

function createCity() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    for (let i = 0; i < 40; i++) {
        const h = 15 + Math.random() * 30;
        const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a3a }));
        let x = (Math.floor(Math.random() * 8) - 4) * 35;
        let z = (Math.floor(Math.random() * 8) - 4) * 35;
        if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
        b.position.set(x, h / 2, z);
        scene.add(b);
    }
}

function spawnNPC() {
    const npc = createPlayer();
    npc.position.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
    npc.userData = { dir: new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize(), speed: 0.03 };
    npcs.push(npc);
    scene.add(npc);
}

function shoot() {
    if (!currentWeapon || inCar) return;

    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    b.position.copy(player.position);
    b.position.y += 1.2;

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    b.userData = { velocity: dir.multiplyScalar(0.8) };

    bullets.push(b);
    scene.add(b);
}

function dropGun(pos) {
    const type = gunTypes[Math.floor(Math.random() * gunTypes.length)];
    const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
    gunMesh.position.copy(pos);
    gunMesh.position.y = 0.1;
    gunMesh.userData = { name: type };
    droppedGuns.push(gunMesh);
    scene.add(gunMesh);
}

function setupEvents() {
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.body.requestPointerLock();
        gameStarted = true;
    });

    window.addEventListener('keydown', (e) => {
        let k = e.key.toLowerCase();
        if (keys.hasOwnProperty(k)) keys[k] = true;
        if (k === 'f' && gameStarted) toggleCar();

        if (!isNaN(k) && parseInt(k) > 0 && parseInt(k) <= inventory.length) {
            currentWeapon = inventory[parseInt(k) - 1];
            document.getElementById('equipped-gun').innerText = currentWeapon;
        }
    });

    window.addEventListener('keyup', (e) => {
        let k = e.key.toLowerCase();
        if (keys.hasOwnProperty(k)) keys[k] = false;
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body) {
            cameraAngleY -= e.movementX * 0.003;
        }
    });

    document.addEventListener('mousedown', () => {
        if (document.pointerLockElement === document.body) shoot();
    });
}

function toggleCar() {
    const dist = player.position.distanceTo(car.position);
    if (!inCar && dist < 4) {
        inCar = true;
        player.visible = false;
        document.getElementById('current-mode').innerText = "Driving";
        document.getElementById('crosshair').style.display = "none";
    } else if (inCar) {
        inCar = false;
        player.visible = true;
        player.position.set(car.position.x - 2, 0, car.position.z);
        document.getElementById('current-mode').innerText = "On Foot";
        if (currentWeapon) document.getElementById('crosshair').style.display = "block";
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (gameStarted) {
        let targetPos = inCar ? car.position : player.position;

        if (!inCar) {
            let moveX = 0, moveZ = 0, moved = false;
            if (keys.w) { moveZ -= 1; moved = true; }
            if (keys.s) { moveZ += 1; moved = true; }
            if (keys.a) { moveX -= 1; moved = true; }
            if (keys.d) { moveX += 1; moved = true; }

            if (moved) {
                let angle = Math.atan2(moveX, moveZ) + cameraAngleY;
                player.rotation.y = angle;
                player.position.x += Math.sin(angle) * 0.12;
                player.position.z += Math.cos(angle) * 0.12;

                walkCycle += 0.2;
                player.getObjectByName("leftLeg").rotation.x = Math.sin(walkCycle) * 0.4;
                player.getObjectByName("rightLeg").rotation.x = -Math.sin(walkCycle) * 0.4;
            }

            camera.position.x = player.position.x - Math.sin(cameraAngleY) * 6;
            camera.position.z = player.position.z - Math.cos(cameraAngleY) * 6;
            camera.position.y = player.position.y + 3;
            camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);

            document.getElementById('prompt').style.display = player.position.distanceTo(car.position) < 4 ? 'block' : 'none';

            for (let i = droppedGuns.length - 1; i >= 0; i--) {
                let g = droppedGuns[i];
                if (player.position.distanceTo(g.position) < 1.5) {
                    inventory.push(g.userData.name);
                    if (!currentWeapon) {
                        currentWeapon = g.userData.name;
                        document.getElementById('equipped-gun').innerText = currentWeapon;
                        document.getElementById('crosshair').style.display = "block";
                    }
                    document.getElementById('weapon-list').innerText = inventory.join(', ');
                    document.getElementById('gun-count').innerText = inventory.length;

                    scene.remove(g);
                    droppedGuns.splice(i, 1);
                }
            }

        } else {
            if (keys.w) carSpeed = Math.min(carSpeed + 0.01, 0.45);
            else if (keys.s) carSpeed = Math.max(carSpeed - 0.01, -0.15);
            else carSpeed *= 0.96;

            if (Math.abs(carSpeed) > 0.02) {
                let dir = carSpeed > 0 ? 1 : -1;
                if (keys.a) carRotation += 0.03 * dir;
                if (keys.d) carRotation -= 0.03 * dir;
            }

            car.rotation.y = carRotation;
            car.position.x += Math.sin(carRotation) * carSpeed;
            car.position.z += Math.cos(carRotation) * carSpeed;

            camera.position.x = car.position.x - Math.sin(carRotation) * 8;
            camera.position.z = car.position.z - Math.cos(carRotation) * 8;
            camera.position.y = car.position.y + 4;
            camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
        }

        npcs.forEach(npc => {
            npc.position.addScaledVector(npc.userData.dir, npc.userData.speed);
            if (Math.abs(npc.position.x) > 80 || Math.abs(npc.position.z) > 80) npc.userData.dir.negate();
        });

        policeCars.forEach(pCar => {
            let siren = pCar.getObjectByName("siren");
            if (siren) siren.material.color.setHex(Date.now() % 400 < 200 ? 0xff0000 : 0x0000ff);

            let angleToPlayer = Math.atan2(targetPos.x - pCar.position.x, targetPos.z - pCar.position.z);
            pCar.rotation.y = angleToPlayer;

            pCar.position.x += Math.sin(angleToPlayer) * pCar.userData.speed;
            pCar.position.z += Math.cos(angleToPlayer) * pCar.userData.speed;

            if (pCar.position.distanceTo(targetPos) < 2.5) {
                alert("BUSTED! (पुलिस ने आपको पकड़ लिया)");
                location.reload();
            }
        });

        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.position.add(b.userData.velocity);

            for (let j = npcs.length - 1; j >= 0; j--) {
                let npc = npcs[j];
                if (b.position.distanceTo(npc.position) < 1.2) {
                    dropGun(npc.position);
                    scene.remove(npc);
                    scene.remove(b);
                    npcs.splice(j, 1);
                    bullets.splice(i, 1);
                    
                    addCrime();
                    spawnNPC();
                    break;
                }
            }
        }
    }

    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
