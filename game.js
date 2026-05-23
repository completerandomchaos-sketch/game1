// Game State
const state = {
    jumps: 0,
    checkpoint: 1,
    currentThemeIndex: 0,
    respawnPos: new THREE.Vector3(0, 5, 0),
    isJumping: false,
    lastPlatformId: -1,
    lastCheckpointPlatformId: 0
};

// Themes
const themes = [
    {
        name: "Heaven",
        skyColor: 0x87CEEB,
        fogColor: 0xffffff,
        fogDensity: 0.02,
        lightColor: 0xfffcd3,
        platformColor: 0xffffff,
        platformEmissive: 0x222222,
        playerColor: 0xffdd44
    },
    {
        name: "Cyberpunk",
        skyColor: 0x050510,
        fogColor: 0x110022,
        fogDensity: 0.03,
        lightColor: 0xff00ff,
        platformColor: 0x111111,
        platformEmissive: 0xaa00ff,
        playerColor: 0x00ffff
    },
    {
        name: "Lava",
        skyColor: 0x220000,
        fogColor: 0x330000,
        fogDensity: 0.04,
        lightColor: 0xff4400,
        platformColor: 0x111111,
        platformEmissive: 0x440000,
        playerColor: 0xffaa00
    },
    {
        name: "Forest",
        skyColor: 0x88cc88,
        fogColor: 0x225522,
        fogDensity: 0.03,
        lightColor: 0xffffdd,
        platformColor: 0x442211,
        platformEmissive: 0x002200,
        playerColor: 0xddffdd
    },
    {
        name: "Space",
        skyColor: 0x000000,
        fogColor: 0x000011,
        fogDensity: 0.01,
        lightColor: 0x8888ff,
        platformColor: 0x333344,
        platformEmissive: 0x000000,
        playerColor: 0xffffff
    }
];

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 150;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

// Fog
scene.fog = new THREE.FogExp2(0xffffff, 0.02);

// Player
const playerRadius = 1;
const playerGeometry = new THREE.SphereGeometry(playerRadius, 32, 32);
const playerMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffdd44,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x221100
});
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.castShadow = true;
player.receiveShadow = true;
scene.add(player);

// Physics & Movement
const playerVelocity = new THREE.Vector3();
const gravity = -40;
const jumpForce = 20;
const moveSpeed = 15;
const drag = 0.9;
let isOnGround = false;

// Controls
const keys = { w: false, a: false, s: false, d: false, space: false };
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() in keys) {
        keys[e.key.toLowerCase()] = true;
    }
    if (e.code === 'Space') keys.space = true;
});
document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() in keys) {
        keys[e.key.toLowerCase()] = false;
    }
    if (e.code === 'Space') keys.space = false;
});

// Platforms
const platforms = [];
let nextPlatformZ = -10;
let platformIdCounter = 0;

function createPlatform(x, y, z, width, depth) {
    const theme = themes[state.currentThemeIndex];
    const geo = new THREE.BoxGeometry(width, 2, depth);
    const mat = new THREE.MeshStandardMaterial({
        color: theme.platformColor,
        emissive: theme.platformEmissive,
        roughness: 0.7,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.platformId = platformIdCounter++;
    scene.add(mesh);
    platforms.push(mesh);
    return mesh;
}

// Initial Platforms
const startPlatform = createPlatform(0, 0, 0, 10, 20); // Start platform
startPlatform.isCheckpoint = true;
startPlatform.material.color.setHex(0x111111);
startPlatform.material.emissive.setHex(0xd4af37);
startPlatform.material.roughness = 0.2;
startPlatform.material.metalness = 1.0;

for(let i=0; i<5; i++) {
    generateNextPlatform();
}

function generateNextPlatform() {
    const lastPlatform = platforms[platforms.length - 1];
    
    // Difficulty increases with jumps
    const gapMultiplier = Math.min(1.5, 1 + (state.jumps * 0.01));
    
    const gapZ = (Math.random() * 5 + 5) * gapMultiplier;
    const gapX = (Math.random() - 0.5) * 10 * gapMultiplier;
    const gapY = (Math.random() - 0.5) * 4;
    
    const width = Math.max(3, 10 - (state.jumps * 0.05));
    const depth = Math.max(5, 15 - (state.jumps * 0.05));

    createPlatform(
        lastPlatform.position.x + gapX,
        lastPlatform.position.y + gapY,
        lastPlatform.position.z - depth/2 - gapZ,
        width,
        depth
    );
}

// UI Updates
const uiJumps = document.getElementById('jump-count');
const uiTheme = document.getElementById('theme-display');
const uiCheckpoint = document.getElementById('checkpoint-display');
const uiNotification = document.getElementById('notification');

function showNotification(text) {
    uiNotification.innerText = text;
    uiNotification.style.opacity = 1;
    setTimeout(() => {
        uiNotification.style.opacity = 0;
    }, 2000);
}

function updateTheme() {
    const theme = themes[state.currentThemeIndex];
    scene.background = new THREE.Color(theme.skyColor);
    scene.fog.color.setHex(theme.fogColor);
    scene.fog.density = theme.fogDensity;
    dirLight.color.setHex(theme.lightColor);
    ambientLight.color.setHex(theme.lightColor);
    playerMaterial.color.setHex(theme.playerColor);
    
    platforms.forEach(p => {
        if (!p.isCheckpoint) {
            p.material.color.setHex(theme.platformColor);
            p.material.emissive.setHex(theme.platformEmissive);
        }
    });

    uiTheme.innerText = `Theme: ${theme.name}`;
}

// Initialize Theme
updateTheme();

function resetPlayer() {
    player.position.copy(state.respawnPos);
    playerVelocity.set(0, 0, 0);
    showNotification("Respawned at Checkpoint");
}

const clock = new THREE.Clock();

function updatePhysics(dt) {
    // Apply gravity
    playerVelocity.y += gravity * dt;

    // Movement input
    const speed = moveSpeed;
    const inputDir = new THREE.Vector3(0, 0, 0);
    
    if (keys.w) inputDir.z -= 1;
    if (keys.s) inputDir.z += 1;
    if (keys.a) inputDir.x -= 1;
    if (keys.d) inputDir.x += 1;
    
    if (inputDir.lengthSq() > 0) {
        inputDir.normalize();
        playerVelocity.x += inputDir.x * speed * dt * 10;
        playerVelocity.z += inputDir.z * speed * dt * 10;
    }
    
    // Damping / Drag (horizontal)
    playerVelocity.x *= Math.pow(drag, dt * 60);
    playerVelocity.z *= Math.pow(drag, dt * 60);

    // Predict next position
    const nextPos = player.position.clone().add(playerVelocity.clone().multiplyScalar(dt));

    // Simple AABB / Sphere collision roughly
    isOnGround = false;
    let currentPlatform = null;

    for (const p of platforms) {
        // Platform bounds
        const box = new THREE.Box3().setFromObject(p);
        
        // Expand box by player radius
        box.expandByScalar(playerRadius * 0.9);

        if (box.containsPoint(nextPos)) {
            // Collision detected. Determine which side.
            // Simplified: mainly care about landing on top
            if (player.position.y >= box.max.y - playerRadius * 1.5 && playerVelocity.y <= 0) {
                // Landed on top
                nextPos.y = box.max.y;
                playerVelocity.y = 0;
                isOnGround = true;
                currentPlatform = p;
                
                // Track jumps
                if (p.platformId > state.lastPlatformId) {
                    state.lastPlatformId = p.platformId;
                    if (p.platformId > 0) {
                        state.jumps++;
                        uiJumps.innerText = `Jumps: ${state.jumps}`;
                        
                        // Checkpoints & Themes
                        if (state.jumps % 10 === 0) {
                            state.checkpoint++;
                            uiCheckpoint.innerText = `Checkpoint: ${state.checkpoint}`;
                            state.respawnPos.copy(player.position);
                            state.respawnPos.y += 5;
                            showNotification("Checkpoint Reached!");
                            
                            platforms.forEach(plat => {
                                if (plat.isCheckpoint) {
                                    plat.isCheckpoint = false;
                                    const theme = themes[state.currentThemeIndex];
                                    plat.material.color.setHex(theme.platformColor);
                                    plat.material.emissive.setHex(theme.platformEmissive);
                                    plat.material.roughness = 0.7;
                                    plat.material.metalness = 0.2;
                                }
                            });
                            
                            p.isCheckpoint = true;
                            p.material.color.setHex(0x111111);
                            p.material.emissive.setHex(0xd4af37);
                            p.material.roughness = 0.2;
                            p.material.metalness = 1.0;
                            
                            // Change Theme
                            state.currentThemeIndex = (state.currentThemeIndex + 1) % themes.length;
                            updateTheme();
                            
                            state.lastCheckpointPlatformId = p.platformId;
                        }
                    }
                }
            } else {
                // Hit side/bottom - bounce slightly
                playerVelocity.x *= -0.5;
                playerVelocity.z *= -0.5;
            }
        }
    }

    // Apply movement
    player.position.copy(nextPos);

    // Jumping
    if (keys.space && isOnGround) {
        playerVelocity.y = jumpForce;
        isOnGround = false;
    }

    // Roll animation based on velocity
    if (isOnGround) {
        const movement = new THREE.Vector3(playerVelocity.x, 0, playerVelocity.z).multiplyScalar(dt);
        const distance = movement.length();
        if (distance > 0.01) {
            const axis = new THREE.Vector3(-movement.z, 0, movement.x).normalize();
            const angle = distance / playerRadius;
            player.rotateOnWorldAxis(axis, angle);
        }
    }

    // Falling below threshold
    if (player.position.y < -50) {
        resetPlayer();
    }
}

function updateCamera() {
    const targetCamPos = player.position.clone();
    targetCamPos.y += 8;
    targetCamPos.z += 15;
    
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 2, -10)));
}

function managePlatforms() {
    // Generate new platforms ahead
    if (platforms.length > 0) {
        const lastPlatform = platforms[platforms.length - 1];
        if (lastPlatform.position.distanceTo(player.position) < 150) {
            generateNextPlatform();
        }
    }

    // Remove old platforms far behind
    for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        if (p.platformId >= state.lastCheckpointPlatformId) continue;
        if (player.position.z - p.position.z < -50 && platforms.length > 10) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            platforms.splice(i, 1);
            i--;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1); // clamp delta time to prevent huge jumps

    updatePhysics(dt);
    updateCamera();
    managePlatforms();

    renderer.render(scene, camera);
}

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start loop
animate();
resetPlayer();
