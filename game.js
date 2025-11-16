// game.js - 完整游戏主代码，已正确集成实体管理功能

// 游戏变量
let scene, camera, renderer, controls;
let snake = [];
let score = 0;
let snakeLength = 5;
let gameRunning = true;
let gridHelper;
let snakeBodyMaterials = [];
let frameCount = 0;
let lastFpsUpdate = 0;
let firstPersonMode = true;
let gameStartTime = 0;
let WORLD_SIZE = 2000;

// 平滑移动变量
let moveProgress = 0;
let MOVE_DURATION = 10;
const BASE_MOVE_DURATION = 10;
const MOVE_DISTANCE = 1;
let moveStartTime = 0;
let isMoving = false;
let targetPosition = new THREE.Vector3(0, 0, 0);

// 方向控制变量
let horizontalAngle = Math.PI / 3;
let verticalAngle = 0;
let targetVerticalAngle = 0;
const ROTATION_SPEED = 0.05;
let direction = new THREE.Vector3(1, 0, 0);

// 小地图变量
let miniMapCtx;
let MINI_MAP_SIZE = 300;
const Y_THRESHOLD = 40;
let isMiniMapFullscreen = false;

// 摇杆变量
let joystickActive = false;
let joystickAngle = 0;
let joystickPower = 0.5;
const JOYSTICK_RADIUS = 70;

// 键盘控制变量
let keys = {};
const BASE_KEY_SPEED = 0.005;
const BASE_POWER_SPEED = 1;

// 光柱指示线
let pathCylinder;
let pathCylinderSolidMaterial, pathCylinderWireMaterial;

// 蛇身位置历史记录
let positionHistory = [];
const HISTORY_MAX_LENGTH = 10000;
const SEGMENT_DISTANCE = 12;

// 食物吸附变量
const ATTRACTION_DISTANCE = 100;
const ATTRACTION_SPEED = 0.1;

// 功率锁定状态
let powerLocked = false;

// 鼠标控制变量
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
const MOUSE_SENSITIVITY = 0.005;

// 触摸控制变量
let isTouching = false;
let touchStartX = 0;
let touchStartY = 0;
let touchLastX = 0;
let touchLastY = 0;
let touchSensitivity = 10;

// 音乐控制变量
let bgm = document.getElementById('bgm');
let eatSound = document.getElementById('eatSound');
let musicPlaying = false;
let musicButton = document.getElementById('musicControlBtn');
let basePlaybackRate = 1.0;

// 实体管理器
let entityManager;

// 性能优化变量
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 1000 / 60;
let lastMiniMapUpdate = 0;
const MINIMAP_UPDATE_INTERVAL = 50;

// 焦点状态
let hasFocus = true;

// 后期处理变量
let composer;
let renderPass, bloomPass, vignettePass;
let bloomStrength = 5;
let bloomRadius = 4;
let bloomThreshold = 4;

// 视锥体裁剪优化
let frustum = new THREE.Frustum();
let cameraViewProjectionMatrix = new THREE.Matrix4();

// 天空盒变量
let skybox;
let skyColors = [
    0x0c1e3a, // 深蓝 - 0分
    0x1a3a5f, // 中蓝 - 500分
    0x2a5a9f, // 亮蓝 - 1000分
    0x3a7adf, // 浅蓝 - 2000分
    0x4a9aff, // 天蓝 - 3000分
    0x5abaff, // 更亮蓝 - 4000分
    0x6adaff, // 淡蓝 - 5000分
    0x7afaff, // 极淡蓝 - 6000分
    0x8affff, // 青色 - 7000分
    0x9affee, // 蓝绿色 - 8000分
    0xaaffdd, // 绿松石 - 9000分
    0xbaffcc, // 海绿色 - 10000分
    0xcaffbb, // 淡绿色 - 11000分
    0xdaffaa, // 黄绿色 - 12000分
    0xeaff99, // 淡黄色 - 13000分
    0xfaff88, // 黄色 - 14000分
    0xffe877, // 橙黄色 - 15000分
    0xffd866, // 橙色 - 16000分
    0xffc855, // 橙红色 - 17000分
    0xffb844, // 红色 - 18000分
    0xffa833, // 深红色 - 19000分
    0xff9822  // 紫红色 - 20000分
];

// 添加焦点事件监听
window.addEventListener('focus', () => {
    hasFocus = true;
    if (musicPlaying) {
        bgm.play().catch(e => console.log("音乐恢复失败:", e));
    }
});

window.addEventListener('blur', () => {
    hasFocus = false;
    if (musicPlaying) {
        bgm.pause();
    }
});

// 添加游戏画布焦点事件
document.getElementById('gameCanvas').addEventListener('click', function() {
    this.focus();
});

document.addEventListener('keydown', function(event) {
    if (!hasFocus) return;
    
    switch (event.key) {
        case 'ArrowUp':
            keys['w'] = true;
            if (!keyAcceleration['w'].pressed) {
                keyAcceleration['w'].pressed = true;
                keyAcceleration['w'].startTime = performance.now();
            }
            break;
        case 'ArrowDown':
            keys['s'] = true;
            if (!keyAcceleration['s'].pressed) {
                keyAcceleration['s'].pressed = true;
                keyAcceleration['s'].startTime = performance.now();
            }
            break;
        case 'ArrowLeft':
            keys['a'] = true;
            if (!keyAcceleration['a'].pressed) {
                keyAcceleration['a'].pressed = true;
                keyAcceleration['a'].startTime = performance.now();
            }
            break;
        case 'ArrowRight':
            keys['d'] = true;
            if (!keyAcceleration['d'].pressed) {
                keyAcceleration['d'].pressed = true;
                keyAcceleration['d'].startTime = performance.now();
            }
            break;
    }
});

document.addEventListener('keyup', function(event) {
    if (!hasFocus) return;
    
    switch (event.key) {
        case 'ArrowUp':
            keys['w'] = false;
            keyAcceleration['w'].pressed = false;
            keyAcceleration['w'].acceleration = 0;
            document.getElementById('accelerationIndicator').style.display = 'none';
            break;
        case 'ArrowDown':
            keys['s'] = false;
            keyAcceleration['s'].pressed = false;
            keyAcceleration['s'].acceleration = 0;
            document.getElementById('accelerationIndicator').style.display = 'none';
            break;
        case 'ArrowLeft':
            keys['a'] = false;
            keyAcceleration['a'].pressed = false;
            keyAcceleration['a'].acceleration = 0;
            document.getElementById('accelerationIndicator').style.display = 'none';
            break;
        case 'ArrowRight':
            keys['d'] = false;
            keyAcceleration['d'].pressed = false;
            keyAcceleration['d'].acceleration = 0;
            document.getElementById('accelerationIndicator').style.display = 'none';
            break;
    }
});

// 键盘加速度系统
let keyAcceleration = {
    a: { pressed: false, startTime: 0, acceleration: 0 },
    d: { pressed: false, startTime: 0, acceleration: 0 },
    w: { pressed: false, startTime: 0, acceleration: 0 },
    s: { pressed: false, startTime: 0, acceleration: 0 }
};
const ACCELERATION_RATE = 0.5;
const MAX_ACCELERATION = 12.0;
const ACCELERATION_DECAY = 0.5;

// 初始化场景
function init() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    try {
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0c1e3a);
        scene.fog = new THREE.FogExp2(0x0c1e3a, 0.0004);
        
        // 创建天空盒
        createSkybox();
        
        // 创建相机
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
        camera.position.set(500, 400, 500);
        camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        
        // 设置设备像素比
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameCanvas').appendChild(renderer.domElement);
        
        // 初始化后期处理
        initPostProcessing();
        
        // 添加轨道控制
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 100;
        controls.maxDistance = 2500;
        controls.enablePan = true;
        
        // 添加光源
        const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(600, 700, 600);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);
        
        const backLight = new THREE.DirectionalLight(0x2255ff, 0.5);
        backLight.position.set(-400, 350, -400);
        scene.add(backLight);
        
        // 创建网格
        gridHelper = new THREE.GridHelper(WORLD_SIZE, 100, 0x305080, 0x203050);
        gridHelper.position.y = 0;
        scene.add(gridHelper);
        
        // 创建边界指示
        createBoundaryIndicators();
        
        // 初始化蛇身材质
        initSnakeMaterials();
        
        // 初始化蛇
        initSnake();
        
        // 创建实体管理器
        entityManager = new EntityManager(scene, WORLD_SIZE);
        
        // 创建光柱指示线
        createPathCylinder();
        
        // 初始化小地图
        initMiniMap();
        
        // 添加事件监听器
        window.addEventListener('resize', onWindowResize);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.getElementById('restartBtn').addEventListener('click', resetGame);
        
        // 修复：确保视角切换按钮正确绑定事件
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        viewToggleBtn.addEventListener('click', toggleFirstPerson);
        viewToggleBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleFirstPerson();
        });
        
        // 添加地图全屏按钮事件
        const mapFullscreenBtn = document.getElementById('mapFullscreenBtn');
        mapFullscreenBtn.addEventListener('click', toggleMiniMapFullscreen);
        mapFullscreenBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleMiniMapFullscreen();
        });
        
        document.getElementById('musicControlBtn').addEventListener('click', toggleMusic);
        document.getElementById('musicControlBtn').addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleMusic();
        });
        
        // 摇杆事件
        setupJoystick();
        
        // 摇杆容器拖动事件
        setupJoystickDrag();
        
        // 功率控制事件
        setupPowerControlVertical();
        
        // 功率锁定按钮事件
        document.getElementById('powerLockBtn').addEventListener('click', togglePowerLock);
        
        // 鼠标事件监听器
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', function() {
            if (firstPersonMode) {
                document.body.requestPointerLock = document.body.requestPointerLock || 
                                                 document.body.mozRequestPointerLock ||
                                                 document.body.webkitRequestPointerLock;
                document.body.requestPointerLock();
            }
        });
        
        // 触摸事件监听器
        setupTouchControls();
        
        // 记录游戏开始时间
        gameStartTime = Date.now();
        
        // 隐藏加载提示
        setTimeout(() => {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }, 0);
        
        // 开始动画循环
        animate();
        
        // 开始第一次移动
        startMove();
    } catch (error) {
        console.error("初始化错误:", error);
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div style="text-align: center; padding: 20px; background: rgba(10,25,50,0.9); border-radius: 10px; max-width: 500px;">
                    <h2 style="color: #ff5555; margin-bottom: 15px;">初始化失败</h2>
                    <p style="color: #a0d5ff; margin-bottom: 20px;">${error.message || "无法初始化3D渲染器"}</p>
                    <p style="color: #a0d5ff; margin-bottom: 20px;">请确保您的设备支持WebGL</p>
                    <button style="background: linear-gradient(45deg, #00ccaa, #00a0ff); 
                        border: none; padding: 12px 30px; border-radius: 50px; 
                        color: white; cursor: pointer; font-size: 1rem;"
                        onclick="location.reload()">重新加载</button>
                </div>
            `;
        }
    }
}

// 创建天空盒
function createSkybox() {
    // 创建一个大的球体作为天空盒
    const skyGeometry = new THREE.SphereGeometry(1500, 64, 64);
    
    // 创建渐变纹理
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // 创建渐变
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#0c1e3a');
    gradient.addColorStop(0.5, '#1a3a5f');
    gradient.addColorStop(1, '#2a5a9f');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        fog: false
    });
    
    skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skybox);
}

// 更新天空盒颜色
function updateSkybox() {
    // 根据分数选择天空盒颜色
    const colorIndex = Math.min(Math.floor(score / 500), skyColors.length - 1);
    const targetColor = new THREE.Color(skyColors[colorIndex]);
    
    // 平滑过渡颜色
    const currentColor = new THREE.Color(skybox.material.color);
    currentColor.lerp(targetColor, 0.01);
    skybox.material.color.copy(currentColor);
    
    // 同时更新场景背景色和雾效
    scene.background.copy(currentColor);
    scene.fog.color.copy(currentColor);
    
    // 更新天空盒纹理的渐变
    updateSkyboxGradient(targetColor);
}

// 更新天空盒渐变
function updateSkyboxGradient(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // 将基础颜色转换为HSL以便调整
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    
    // 创建渐变
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    
    // 中心颜色（较亮）
    const centerColor = new THREE.Color().setHSL(
        hsl.h, 
        Math.min(1, hsl.s * 0.8), 
        Math.min(1, hsl.l * 1.3)
    );
    
    // 边缘颜色（较暗）
    const edgeColor = new THREE.Color().setHSL(
        (hsl.h + 0.1) % 1, 
        Math.min(1, hsl.s * 1.2), 
        Math.max(0, hsl.l * 0.7)
    );
    
    gradient.addColorStop(0, '#' + centerColor.getHexString());
    gradient.addColorStop(1, '#' + edgeColor.getHexString());
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // 更新纹理
    skybox.material.map.dispose();
    skybox.material.map = new THREE.CanvasTexture(canvas);
    skybox.material.needsUpdate = true;
}

// 初始化后期处理
function initPostProcessing() {
    // 创建后期处理composer
    composer = new THREE.EffectComposer(renderer);
    
    // 创建渲染通道
    renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // 创建泛光效果
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloomStrength,
        bloomRadius,
        bloomThreshold
    );
    composer.addPass(bloomPass);
    
    // 创建暗角效果（光圈效果）
    vignettePass = new THREE.ShaderPass(THREE.VignetteShader);
    vignettePass.uniforms["offset"].value = 0.8;
    vignettePass.uniforms["darkness"].value = 1.2;
    composer.addPass(vignettePass);
    
    // 设置渲染到屏幕
    vignettePass.renderToScreen = true;
}

// 更新后期处理
function updatePostProcessing() {
    // 更新composer尺寸
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // 根据蛇的速度调整泛光效果
    if (snake.length > 0) {
        const speedFactor = Math.min(1, MOVE_DURATION / BASE_MOVE_DURATION);
        bloomPass.strength = bloomStrength + (1 - speedFactor) * 0.5;
    }
}

// 检查对象是否在视锥体内
function isInFrustum(object) {
    // 更新视锥体
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    camera.projectionMatrixMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
    
    // 检查对象是否在视锥体内
    const sphere = new THREE.Sphere();
    object.geometry.computeBoundingSphere();
    sphere.copy(object.geometry.boundingSphere);
    sphere.applyMatrix4(object.matrixWorld);
    
    return frustum.intersectsSphere(sphere);
}

// 播放吞噬音效
function playEatSound() {
    if (eatSound) {
        eatSound.currentTime = 0;
        eatSound.play().catch(e => {
            console.log("吞噬音效播放失败:", e);
        });
    }
}

// 切换音乐播放状态
function toggleMusic() {
    if (musicPlaying) {
        bgm.pause();
        musicButton.textContent = '🔇';
        musicPlaying = false;
    } else {
        bgm.play().catch(e => {
            console.log("音乐播放需要用户交互:", e);
        });
        musicButton.textContent = '🔊';
        musicPlaying = true;
    }
}

// 更新音乐速度
function updateMusicSpeed() {
    if (!musicPlaying) return;
    
    const speedLevel = Math.floor(score / 100);
    const playbackRate = Math.min(2.0, basePlaybackRate + speedLevel * 0.1);
    bgm.playbackRate = playbackRate;
}

// 设置触摸控制
function setupTouchControls() {
    const touchLeft = document.getElementById('touchLeft');
    const touchRight = document.getElementById('touchRight');
    
    touchLeft.addEventListener('touchstart', onTouchStart);
    touchLeft.addEventListener('touchmove', onTouchMove);
    touchLeft.addEventListener('touchend', onTouchEnd);
    
    touchRight.addEventListener('touchstart', onTouchStart);
    touchRight.addEventListener('touchmove', onTouchMove);
    touchRight.addEventListener('touchend', onTouchEnd);
}

// 触摸开始
function onTouchStart(e) {
    if (!firstPersonMode || !gameRunning) return;
    
    isTouching = true;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchLastX = touch.clientX;
    touchLastY = touch.clientY;
}

// 触摸移动
function onTouchMove(e) {
    if (!isTouching || !firstPersonMode || !gameRunning) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchLastX;
    const deltaY = touch.clientY - touchLastY;
    
    touchLastX = touch.clientX;
    touchLastY = touch.clientY;
    
    // 根据灵敏度调整
    const sensitivity = touchSensitivity * 0.001;
    
    // 更新水平角度
    horizontalAngle += deltaX * sensitivity;
    
    // 更新垂直角度并限制范围
    joystickPower -= deltaY * sensitivity;
    joystickPower = Math.max(0, Math.min(1, joystickPower));
   
    
    // 更新方向向量
    updateDirectionVector();
    
    // 更新功率控制显示
    updatePowerControl();
    
    // 更新摇杆显示
    updateJoystickDisplay();
}

// 触摸结束
function onTouchEnd() {
    isTouching = false;
}

// 鼠标移动事件处理
function onMouseMove(event) {
    if (!firstPersonMode || !gameRunning) return;
    
    // 计算鼠标移动量
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
    // 更新水平角度
    horizontalAngle += movementX * MOUSE_SENSITIVITY;
    
    // 更新垂直角度并限制范围
    joystickPower = Math.max(0, Math.min(1, joystickPower - movementY * MOUSE_SENSITIVITY));
    
    // 更新方向向量
    updateDirectionVector();
}

// 切换第一人称模式
function toggleFirstPerson() {
    firstPersonMode = !firstPersonMode;
    const btn = document.getElementById('viewToggleBtn');
    const indicator = document.getElementById('fpIndicator');
    const crosshair = document.getElementById('crosshair');
    const touchControls = document.getElementById('touchControls');
    
    if (firstPersonMode) {
        btn.textContent = "🎥V";
        indicator.style.display = 'block';
        
        crosshair.style.display = 'block';
        touchControls.style.display = 'block';
        
        // 在第一人称模式下隐藏蛇头
        if (snake.length > 0) {
            snake[0].visible = false;
        }
        
        // 禁用轨道控制
        controls.enabled = false;
        
        // 切换光柱材质为线框
        if (pathCylinder) {
            pathCylinder.material = pathCylinderWireMaterial;
        }
        
        // 请求指针锁定
        if ('requestPointerLock' in document.body) {
            document.body.requestPointerLock();
        }
    } else {
        btn.textContent = "👁️V";
        indicator.style.display = 'none';
        
        crosshair.style.display = 'none';
        touchControls.style.display = 'none';
        
        // 在第三人称模式下显示蛇头
        if (snake.length > 0) {
            snake[0].visible = true;
        }
        
        // 启用轨道控制
        controls.enabled = true;
        
        // 切换光柱材质为实心
        if (pathCylinder) {
            pathCylinder.material = pathCylinderSolidMaterial;
        }
        
        // 修复：在切换到第三人称时，将相机重置到合适的位置
        initThirdPersonCamera();
        
        // 退出指针锁定
        if ('exitPointerLock' in document) {
            document.exitPointerLock();
        }
    }
}

// 切换小地图全屏模式
function toggleMiniMapFullscreen() {
    const miniMapContainer = document.querySelector('.mini-map-container');
    const mapControls = document.querySelector('.map-controls');
    const heightIndicator = document.querySelector('.height-indicator');
    
    isMiniMapFullscreen = !isMiniMapFullscreen;
    
    if (isMiniMapFullscreen) {
        miniMapContainer.classList.add('fullscreen');
        mapControls.classList.add('fullscreen-controls');
        heightIndicator.classList.add('fullscreen-indicator');
        
        // 重新初始化小地图以适应全屏尺寸
        initMiniMap();
    } else {
        miniMapContainer.classList.remove('fullscreen');
        mapControls.classList.remove('fullscreen-controls');
        heightIndicator.classList.remove('fullscreen-indicator');
        
        // 重新初始化小地图以适应正常尺寸
        initMiniMap();
    }
}

// 初始化第三人称相机
function initThirdPersonCamera() {
    if (snake.length > 0) {
        const head = snake[0];
        const cameraDistance = 300;
        const cameraHeight = 200;
        
        // 计算相机位置
        camera.position.set(
            head.position.x - cameraDistance,
            head.position.y + cameraHeight,
            head.position.z - cameraDistance
        );
        
        // 让相机看向蛇头
        camera.lookAt(head.position);
        
        // 启用轨道控制
        controls.enabled = true;
        controls.target.copy(head.position);
    }
}

// 更新第一人称相机
function updateFirstPersonCamera() {
    if (!snake.length) return;
    
    const head = snake[0];
    
    // 设置相机位置在蛇头前方
    const offset = direction.clone().multiplyScalar(30); // 30单位前方
    camera.position.copy(head.position).add(offset);
    
    // 设置相机朝向与蛇前进方向相同
    camera.lookAt(head.position.clone().add(direction.clone().multiplyScalar(100)));
}

// 更新第三人称相机
function updateThirdPersonCamera() {
    if (!snake.length || firstPersonMode) return;
    
    const head = snake[0];
    const cameraDistance = 300;
    const cameraHeight = 200;
    
    // 平滑跟随蛇头
    const targetPosition = new THREE.Vector3(
        head.position.x - cameraDistance,
        head.position.y + cameraHeight,
        head.position.z - cameraDistance
    );
    
    camera.position.lerp(targetPosition, 0.1);
    controls.target.copy(head.position);
    controls.update();
}

// 设置垂直功率控制
function setupPowerControlVertical() {
    const powerSlider = document.getElementById('powerSliderVertical');
    const powerIndicator = document.getElementById('powerIndicatorVertical');
    const powerGear = document.getElementById('powerGear');
    
    // 功率滑块事件
    powerSlider.addEventListener('input', function() {
        let rawValue = parseInt(this.value);
        
        // 在0.5功率附近添加吸附效果 (48-52之间吸附到50)
        if (rawValue >= 48 && rawValue <= 52) {
            rawValue = 50;
            this.value = 50;
        }
        
        joystickPower = rawValue / 100;
        
        // 更新功率指示器
        powerIndicator.textContent = joystickPower.toFixed(2);
        
        // 更新档把颜色
        updateGearColor();
        
        // 更新摇杆显示
        updateJoystickDisplay();
    });
    
    // 初始化档把颜色
    updateGearColor();
}

// 切换功率锁定状态
function togglePowerLock() {
    const lockBtn = document.getElementById('powerLockBtn');
    powerLocked = !powerLocked;
    
    if (powerLocked) {
        lockBtn.classList.add('locked');
        lockBtn.textContent = '🔒';
    } else {
        lockBtn.classList.remove('locked');
        lockBtn.textContent = '🔓';
    }
}

// 更新档把颜色
function updateGearColor() {
    const powerGear = document.getElementById('powerGear');
    if (!powerGear) return;
    
    // 根据功率值设置不同颜色
    if (joystickPower < 0.3) {
        powerGear.style.background = 'linear-gradient(45deg, #ff5555, #ff9966)';
    } else if (joystickPower < 0.7) {
        powerGear.style.background = 'linear-gradient(45deg, #44aa66, #66cc88)';
    } else {
        powerGear.style.background = 'linear-gradient(45deg, #0066cc, #0099ff)';
    }
}

// 更新摇杆显示
function updateJoystickDisplay() {
    const joystickStats = document.querySelector('.joystick-stats');
    if (!joystickStats) return;
    
    const angleDeg = Math.round((horizontalAngle * 180 / Math.PI + 360) % 360);
    const powerPercent = Math.round(joystickPower * 100);
    
    joystickStats.innerHTML = `${angleDeg}°<br>${powerPercent}%`;
}

// 创建光柱指示线
function createPathCylinder() {
    const cylinderGeometry = new THREE.CylinderGeometry(8, 8, 1, 4, 1, true);
    
    // 实心材质
    pathCylinderSolidMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.4,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
    });
    
    // 线框材质（用于第一人称模式）
    pathCylinderWireMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        wireframe: true,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide
    });
    
    pathCylinder = new THREE.Mesh(cylinderGeometry, pathCylinderSolidMaterial);
    pathCylinder.rotation.x = Math.PI / 2;
    scene.add(pathCylinder);
}

// 更新光柱指示线
function updatePathCylinder() {
    if (!snake.length) return;
    
    const head = snake[0];
    const headPos = head.position;
    
    // 计算光柱方向
    const directionVector = direction.clone().normalize();
    
    // 计算光柱长度
    const distanceToBoundary = Math.min(
        (WORLD_SIZE/2 - Math.abs(headPos.x)) / Math.abs(directionVector.x),
        (WORLD_SIZE/2 - Math.abs(headPos.y)) / Math.abs(directionVector.y),
        (WORLD_SIZE/2 - Math.abs(headPos.z)) / Math.abs(directionVector.z)
    );
    
    const cylinderLength = Math.min(distanceToBoundary, WORLD_SIZE);
    
    // 更新光柱位置和尺寸
    pathCylinder.scale.set(1, cylinderLength, 1);
    pathCylinder.position.copy(headPos);
    pathCylinder.position.add(directionVector.clone().multiplyScalar(cylinderLength/2));
    
    // 旋转光柱以匹配方向
    pathCylinder.lookAt(headPos.clone().add(directionVector.clone().multiplyScalar(100)));
    pathCylinder.rotateX(Math.PI / 2);
}

// 初始化小地图
function initMiniMap() {
    const miniMap = document.getElementById('miniMap');
    const container = document.querySelector('.mini-map-container');
    
    // 根据是否全屏设置尺寸
    if (isMiniMapFullscreen) {
        // 全屏模式
        miniMap.width = window.innerWidth * window.devicePixelRatio;
        miniMap.height = window.innerHeight * window.devicePixelRatio;
        miniMap.style.width = window.innerWidth + 'px';
        miniMap.style.height = window.innerHeight + 'px';
    } else {
        // 正常模式
        const size = Math.min(container.clientWidth, container.clientHeight);
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        miniMap.width = size * pixelRatio;
        miniMap.height = size * pixelRatio;
        miniMap.style.width = size + 'px';
        miniMap.style.height = size + 'px';
    }
    
    miniMapCtx = miniMap.getContext('2d');
}

// 更新小地图
function updateMiniMap() {
    const currentTime = performance.now();
    if (currentTime - lastMiniMapUpdate < MINIMAP_UPDATE_INTERVAL) return;
    lastMiniMapUpdate = currentTime;
    
    if (!miniMapCtx || snake.length === 0 || !entityManager) return;
    
    const head = snake[0];
    
    // 清空画布
    miniMapCtx.clearRect(0, 0, miniMapCtx.canvas.width, miniMapCtx.canvas.height);
    
    // 动态计算缩放比例
    const scale = miniMapCtx.canvas.width / WORLD_SIZE;
    const mapSize = miniMapCtx.canvas.width;
    
    // 绘制网格
    miniMapCtx.strokeStyle = 'rgba(12, 30, 58, 0.2)';
    miniMapCtx.lineWidth = 2;
    
    const gridSize = 10;
    for (let i = 0; i <= gridSize; i++) {
        const pos = i * (mapSize / gridSize);
        miniMapCtx.beginPath();
        miniMapCtx.moveTo(pos, 0);
        miniMapCtx.lineTo(pos, mapSize);
        miniMapCtx.stroke();
        
        miniMapCtx.beginPath();
        miniMapCtx.moveTo(0, pos);
        miniMapCtx.lineTo(mapSize, pos);
        miniMapCtx.stroke();
    }
    
    // 玩家蛇头位置转换
    const headX = (head.position.x + WORLD_SIZE/2) * scale;
    const headZ = mapSize - ((-head.position.z) + WORLD_SIZE/2) * scale;
    
    // 确保玩家蛇头在可见范围内
    if (headX >= 0 && headX <= mapSize && headZ >= 0 && headZ <= mapSize) {
        // 绘制玩家蛇头
        miniMapCtx.fillStyle = '#00ffaa';
        miniMapCtx.beginPath();
        miniMapCtx.arc(headX, headZ, 5, 0, Math.PI * 2);
        miniMapCtx.fill();
        
        // 绘制玩家蛇身
        for (let i = 1; i < snake.length; i++) {
            const segment = snake[i];
            const segX = (segment.position.x + WORLD_SIZE/2) * scale;
            const segZ = mapSize - ((-segment.position.z) + WORLD_SIZE/2) * scale;
            
            if (segX >= 0 && segX <= mapSize && segZ >= 0 && segZ <= mapSize) {
                miniMapCtx.fillStyle = '#00aaff';
                miniMapCtx.beginPath();
                miniMapCtx.arc(segX, segZ, 3, 0, Math.PI * 2);
                miniMapCtx.fill();
            }
        }
        
        // 方向指示
        const dirX = headX + direction.x * 20;
        const dirZ = headZ + direction.z * 20;
        
        miniMapCtx.strokeStyle = '#00ffaa';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.beginPath();
        miniMapCtx.moveTo(headX, headZ);
        miniMapCtx.lineTo(dirX, dirZ);
        miniMapCtx.stroke();
    }
    
    // 获取所有需要在小地图上显示的实体（只显示与蛇头Y坐标相差不超过40的实体）
    const minimapEntities = entityManager.getMinimapEntities(head.position);
    
    // 绘制所有实体
    for (const entity of minimapEntities) {
        const entityX = (entity.position.x + WORLD_SIZE/2) * scale;
        const entityZ = mapSize - ((-entity.position.z) + WORLD_SIZE/2) * scale;
        
        if (entityX >= 0 && entityX <= mapSize && entityZ >= 0 && entityZ <= mapSize) {
            miniMapCtx.fillStyle = entity.color;
            miniMapCtx.beginPath();
            miniMapCtx.arc(entityX, entityZ, entity.size, 0, Math.PI * 2);
            miniMapCtx.fill();
            
            // 如果是AI蛇，还需要绘制蛇身
            if (entity.type === 'aiSnake' && entity.segments) {
                for (const segment of entity.segments) {
                    const segX = (segment.x + WORLD_SIZE/2) * scale;
                    const segZ = mapSize - ((-segment.z) + WORLD_SIZE/2) * scale;
                    
                    if (segX >= 0 && segX <= mapSize && segZ >= 0 && segZ <= mapSize) {
                        miniMapCtx.fillStyle = '#ff5555';
                        miniMapCtx.beginPath();
                        miniMapCtx.arc(segX, segZ, 2, 0, Math.PI * 2);
                        miniMapCtx.fill();
                    }
                }
            }
        }
    }
    
    // 更新高度指示器
    document.querySelector('.height-indicator').textContent = `y: ${Math.round(head.position.y)}`;
}

// 将AI蛇转换为食物
function convertAISnakeToFood(aiSnake) {
    for (let i = 0; i < aiSnake.body.length; i++) {
        const segment = aiSnake.body[i];
        
        // 创建食物并添加到食物管理器
        entityManager.foodManager.addFoodAtPosition(segment.position);
    }
}

// 颜色插值函数
function interpolateColor(color1, color2, ratio) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// 初始化蛇身材质
function initSnakeMaterials() {
    snakeBodyMaterials = [];
    
    // 创建蛇身材质的渐变
    const headColor = "#00ffaa";
    const bodyStartColor = "#00ffaa";
    const bodyEndColor = "#00aaff";
    
    for (let i = 0; i < 10; i++) {
        const ratio = i / 9;
        const color = interpolateColor(bodyStartColor, bodyEndColor, ratio);
        
        snakeBodyMaterials.push(new THREE.MeshPhongMaterial({ 
            color: new THREE.Color(color),
            shininess: 80,
            emissive: new THREE.Color(color).multiplyScalar(0.1),
            emissiveIntensity: 0.5
        }));
    }
}

// 初始化蛇
function initSnake() {
    // 移除现有蛇身
    snake.forEach(segment => scene.remove(segment));
    snake = [];
    positionHistory = [];
    
    // 创建蛇头
    const headGeometry = new THREE.BoxGeometry(12, 12, 12);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color("#00ffaa"),
        shininess: 100,
        emissive: new THREE.Color("#00ffaa").multiplyScalar(0.3),
        emissiveIntensity: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0, 0);
    head.castShadow = true;
    head.receiveShadow = true;
    scene.add(head);
    snake.push(head);
    targetPosition.copy(head.position);
    
    // 创建初始蛇身
    for (let i = 1; i < snakeLength; i++) {
        addSnakeSegment();
    }
}

// 添加蛇身段
function addSnakeSegment() {
    const segmentGeometry = new THREE.BoxGeometry(11, 11, 11);
    const materialIndex = (snake.length - 1) % snakeBodyMaterials.length;
    const segment = new THREE.Mesh(segmentGeometry, snakeBodyMaterials[materialIndex]);
    
    // 位置在蛇尾之后
    const lastSegment = snake[snake.length - 1];
    segment.position.copy(lastSegment.position);
    segment.position.x -= direction.x * 12;
    segment.position.y -= direction.y * 12;
    segment.position.z -= direction.z * 12;
    
    segment.castShadow = true;
    segment.receiveShadow = true;
    scene.add(segment);
    snake.push(segment);
}

// 创建边界指示
function createBoundaryIndicators() {
    const boundaryMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x203050,
        wireframe: true,
        opacity: 0.1,
        transparent: true
    });
    
    const boundaryGeometry = new THREE.BoxGeometry(WORLD_SIZE, WORLD_SIZE, WORLD_SIZE);
    const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    scene.add(boundary);
}

// 更新方向向量
function updateDirectionVector() {
    // 平滑过渡垂直角度
    verticalAngle += (targetVerticalAngle - verticalAngle) * 0.2;
    
    // 根据水平角和垂直角计算方向向量
    direction.x = Math.cos(verticalAngle) * Math.sin(horizontalAngle);
    direction.y = Math.sin(verticalAngle);
    direction.z = Math.cos(verticalAngle) * Math.cos(horizontalAngle);
    
    // 归一化
    direction.normalize();
    
    // 翻转z轴
    direction.z = -direction.z;
    
    // 更新光柱指示线
    updatePathCylinder();
}

// 开始移动
function startMove() {
    if (isMoving) return;
    
    isMoving = true;
    moveStartTime = performance.now();
    moveProgress = 0;
    
    // 设置目标位置
    targetPosition.copy(snake[0].position);
    targetPosition.add(direction.clone().multiplyScalar(MOVE_DISTANCE));
}

// 更新移动
function updateMove(timestamp) {
    if (!isMoving) return;
    
    const elapsed = timestamp - moveStartTime;
    moveProgress = Math.min(elapsed / MOVE_DURATION, 1);
    
    // 计算蛇头当前位置
    const newHeadPosition = new THREE.Vector3().lerpVectors(
        snake[0].position, 
        targetPosition, 
        moveProgress
    );
    
    // 保存蛇头原位置
    const prevHeadPosition = snake[0].position.clone();
    
    // 更新蛇头位置
    snake[0].position.copy(newHeadPosition);
    
    // 记录位置历史
    positionHistory.unshift(snake[0].position.clone());
    if (positionHistory.length > HISTORY_MAX_LENGTH) {
        positionHistory.pop();
    }
    
    // 更新蛇身位置
    for (let i = 1; i < snake.length; i++) {
        const targetIndex = Math.min(positionHistory.length - 1, i * SEGMENT_DISTANCE);
        if (targetIndex < positionHistory.length) {
            const targetPosition = positionHistory[targetIndex];
            snake[i].position.lerp(targetPosition, 0.3);
            
        }
    }
    
    // 在移动过程中检查碰撞
    checkCollisions();
    
    // 检查移动是否完成
    if (moveProgress >= 1) {
        isMoving = false;
        
        // 检查边界和障碍物碰撞
        if (checkBoundaryCollision() || entityManager.checkObstacleCollisions(snake[0].position)) {
            gameOver();
        } else {
            // 立即开始下一次移动
            startMove();
        }
    }
}

// 检查所有碰撞
function checkCollisions() {
    const headPos = snake[0].position;
    
    // 检查与所有实体的碰撞
    entityManager.checkCollisions(
        headPos,
        // 食物碰撞回调
        (food, index) => {
            score += 10;
            
            // 每吃一个食物增加2段身体
            addSnakeSegment();
            addSnakeSegment();
            
            // 播放吞噬音效
            playEatSound();
            
            // 将被吃的食物移动到新位置
            food.randomizePosition();
            
            // 更新UI
            updateUI();
        },
        // 小球藻碰撞回调
        (alga) => {
            // 增加分数
            score += 50;
            
            // 添加蛇身段
            addSnakeSegment();
            
            // 播放吞噬音效
            playEatSound();
            
            // 将被吃的小球藻变成食物
            convertToFood(alga.mesh.position);
            
            // 更新UI
            updateUI();
        },
        // 海带碰撞回调
        (kelp) => {
            // 增加分数
            score += 30;
            
            // 添加蛇身段
            addSnakeSegment();
            addSnakeSegment();
            
            // 播放吞噬音效
            playEatSound();
            
            // 将被吃的海带变成食物
            convertToFood(kelp.mesh.position);
            
            // 更新UI
            updateUI();
        },
        // 变形虫碰撞回调
        (amoeba) => {
            // 增加分数
            score += 200;
            
            // 添加蛇身段
            addSnakeSegment();
            addSnakeSegment();
            addSnakeSegment();
            
            // 播放吞噬音效
            playEatSound();
            
            // 更新UI
            updateUI();
        },
        // AI蛇碰撞回调
        (aiSnake) => {
            // 增加分数
            score += 500;
            
            // 播放吞噬音效
            playEatSound();
            
            // 将AI蛇变成食物
            convertAISnakeToFood(aiSnake);
            
            // 更新UI
            updateUI();
        },
        // 分形植物碰撞回调
        (plant) => {
            score += 150;
            playEatSound();
            addSnakeSegment();
            addSnakeSegment();
            updateUI();
        },
        // 斐波那契生命体碰撞回调
        (creature) => {
            score += 300;
            playEatSound();
            addSnakeSegment();
            addSnakeSegment();
            addSnakeSegment();
            updateUI();
        }
    );
}

// 将位置转换为食物
function convertToFood(position) {
    entityManager.foodManager.addFoodAtPosition(position);
}

// 检查边界碰撞
function checkBoundaryCollision() {
    const head = snake[0].position;
    
    // 边界碰撞
    if (Math.abs(head.x) > WORLD_SIZE/2 - 10 || 
        Math.abs(head.y) > WORLD_SIZE/2 - 10 || 
        Math.abs(head.z) > WORLD_SIZE/2 - 10) {
        return true;
    }
    
    return false;
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'flex';
    
    // 暂停音乐
    bgm.pause();
    musicPlaying = false;
    musicButton.textContent = '🔇';
}

// 重置游戏 - 简化为页面刷新
function resetGame() {
    location.reload();
}

// 更新UI
function updateUI() {
    document.getElementById('scoreDisplay').textContent = `🧬: ${score}`;
    
    // 每达到100分加快游戏速度
    const speedLevel = Math.floor(score / 100);
    MOVE_DURATION = Math.max(3, BASE_MOVE_DURATION - speedLevel);
    
    // 更新音乐速度
    updateMusicSpeed();
    
    // 更新天空盒
    updateSkybox();
}

// 键盘事件处理
function onKeyDown(event) {
    if (!hasFocus) return;
    
    const key = event.key.toLowerCase();
    keys[key] = true;
    
    // 更新加速度状态
    if (['a', 'd', 'w', 's'].includes(key) && !keyAcceleration[key].pressed) {
        keyAcceleration[key].pressed = true;
        keyAcceleration[key].startTime = performance.now();
    }
    
    switch (event.key) {
        case ' ':
            gameRunning = !gameRunning;
            document.getElementById('pauseOverlay').style.display = gameRunning ? 'none' : 'flex';
            
            // 暂停/继续音乐
            if (gameRunning && musicPlaying) {
                bgm.play();
            } else if (!gameRunning && musicPlaying) {
                bgm.pause();
            }
            break;
        case 'r':
        case 'R':
            resetGame();
            break;
        case 'v':
        case 'V':
            toggleFirstPerson();
            break;
        case 'm':
        case 'M':
            toggleMusic();
            break;
        case 'f':
        case 'F':
            toggleMiniMapFullscreen();
            break;
    }
}

function onKeyUp(event) {
    if (!hasFocus) return;
    
    const key = event.key.toLowerCase();
    keys[key] = false;
    
    // 重置加速度状态
    if (['a', 'd', 'w', 's'].includes(key)) {
        keyAcceleration[key].pressed = false;
        keyAcceleration[key].acceleration = 0;
        document.getElementById('accelerationIndicator').style.display = 'none';
    }
}

// 处理键盘输入（带加速度）
function handleKeyboardInput() {
    let anyKeyPressed = false;
    let maxAcceleration = 0;
    
    // 更新加速度
    for (let key in keyAcceleration) {
        if (keyAcceleration[key].pressed) {
            // 增加加速度（但不超过最大值）
            keyAcceleration[key].acceleration = Math.min(
                MAX_ACCELERATION, 
                keyAcceleration[key].acceleration + ACCELERATION_RATE
            );
            
            anyKeyPressed = true;
            maxAcceleration = Math.max(maxAcceleration, keyAcceleration[key].acceleration);
        } else if (keyAcceleration[key].acceleration > 0) {
            // 衰减加速度
            keyAcceleration[key].acceleration = Math.max(
                0, 
                keyAcceleration[key].acceleration - ACCELERATION_DECAY
            );
        }
    }
    
    // 显示加速度指示器
    if (anyKeyPressed) {
        const indicator = document.getElementById('accelerationIndicator');
        indicator.style.display = 'block';
        indicator.textContent = `📈: ${maxAcceleration.toFixed(1)}x`;
    }
    
    // 计算实际速度：基础速度 * (1 + 加速度)
    const currentSpeedA = BASE_KEY_SPEED * (1 + keyAcceleration.a.acceleration);
    const currentSpeedD = BASE_KEY_SPEED * (1 + keyAcceleration.d.acceleration);
    const currentSpeedW = BASE_POWER_SPEED * (1 + keyAcceleration.w.acceleration);
    const currentSpeedS = BASE_POWER_SPEED * (1 + keyAcceleration.s.acceleration);

    if (keys['a']) {
        horizontalAngle -= currentSpeedA;
    }
    if (keys['d']) {
        horizontalAngle += currentSpeedD;
    }
    if (keys['w'] && !powerLocked) {
        joystickPower = Math.min(1, joystickPower + 0.0012*currentSpeedW);
    }
    if (keys['s'] && !powerLocked) {
        joystickPower = Math.max(0, joystickPower - 0.0012*currentSpeedS);
    }
    
    // 更新摇杆角度
    joystickAngle = horizontalAngle - Math.PI/2;
    
    // 更新垂直角度
    verticalAngle = Math.max(-Math.PI/2, Math.min(Math.PI/2, (joystickPower - 0.5) * Math.PI/2));
    
    // 更新方向向量
    updateDirectionVector();
    
    // 更新功率控制
    updatePowerControl();
    
    // 更新摇杆显示
    updateJoystickDisplay();
}

// 窗口大小调整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // 设置设备像素比
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 更新后期处理
    updatePostProcessing();
    
    // 重新初始化小地图以适应新尺寸
    initMiniMap();
}

// 设置摇杆功能
function setupJoystick() {
    const joystickHead = document.getElementById('joystickHead');
    const joystickContainer = document.getElementById('joystickContainer');
    const directionIndicator = document.getElementById('directionIndicator');
    
    let startX, startY;
    let baseRect;
    
    // 触摸开始
    joystickHead.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystickHead.getBoundingClientRect();
        startX = touch.clientX - rect.left - rect.width/2;
        startY = touch.clientY - rect.top - rect.height/2;
        baseRect = joystickContainer.getBoundingClientRect();
        joystickActive = true;
        joystickContainer.classList.add('active');
    });
    
    // 触摸移动
    document.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const centerX = baseRect.left + baseRect.width/2;
        const centerY = baseRect.top + baseRect.height/2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        
        // 计算距离和角度
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), baseRect.width/2);
        joystickAngle = Math.atan2(deltaY, deltaX);
      
        // 在功率未锁定时更新功率
        if (!powerLocked) {
            joystickPower = distance / (baseRect.width/2);
        }
        
        // 更新摇杆头位置
        const offsetX = distance * Math.cos(joystickAngle);
        const offsetY = distance * Math.sin(joystickAngle);
        
        joystickHead.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // 更新方向指示
        const angleDeg = Math.round((joystickAngle * 180 / Math.PI + 360) % 360);
        directionIndicator.textContent = `↑ ${angleDeg}°`;
        
        // 更新游戏方向
        horizontalAngle = joystickAngle + Math.PI/2;
        verticalAngle = Math.max(-Math.PI/3, Math.min(Math.PI/3, (joystickPower - 0.5) * Math.PI/3));
        updateDirectionVector();
        
        // 更新功率控制
        if (!powerLocked) {
            updatePowerControl();
        }
        
        // 更新摇杆显示
        updateJoystickDisplay();
    });
    
    // 触摸结束
    document.addEventListener('touchend', () => {
        if (!joystickActive) return;
        joystickActive = false;
        joystickContainer.classList.remove('active');
        // 保持摇杆在当前位置，不重置
        directionIndicator.textContent = '';
    });
    
    // 鼠标事件
    joystickHead.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const rect = joystickHead.getBoundingClientRect();
        startX = e.clientX - rect.left - rect.width/2;
        startY = e.clientY - rect.top - rect.height/2;
        baseRect = joystickContainer.getBoundingClientRect();
        joystickActive = true;
        joystickContainer.classList.add('active');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        
        const centerX = baseRect.left + baseRect.width/2;
        const centerY = baseRect.top + baseRect.height/2;
        
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        
        // 计算距离和角度
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), baseRect.width/2);
        joystickAngle = Math.atan2(deltaY, deltaX);
        
        // 在功率未锁定时更新功率
        if (!powerLocked) {
            joystickPower = distance / (baseRect.width/2);
        }
        
        // 更新摇杆头位置
        const offsetX = distance * Math.cos(joystickAngle);
        const offsetY = distance * Math.sin(joystickAngle);
        
        joystickHead.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // 更新方向指示
        const angleDeg = Math.round((joystickAngle * 180 / Math.PI + 360) % 360);
        directionIndicator.textContent = `↑ ${angleDeg}°`;
        
        // 更新游戏方向
        horizontalAngle = joystickAngle + Math.PI/2;
        verticalAngle = Math.max(-Math.PI/2, Math.min(Math.PI/2, (joystickPower - 0.5) * Math.PI/2));
        updateDirectionVector();
        
        // 更新功率控制
        if (!powerLocked) {
            updatePowerControl();
        }
        
        // 更新摇杆显示
        updateJoystickDisplay();
    });
    
    document.addEventListener('mouseup', () => {
        if (!joystickActive) return;
        joystickActive = false;
        joystickContainer.classList.remove('active');
        directionIndicator.textContent = '';
    });
}

// 更新功率控制
function updatePowerControl() {
    const powerSlider = document.getElementById('powerSliderVertical');
    const powerIndicator = document.getElementById('powerIndicatorVertical');
    
    if (powerSlider && powerIndicator) {
        // 更新滑块位置
        powerSlider.value = Math.round(joystickPower * 100);
        
        // 更新功率指示器
        powerIndicator.textContent = joystickPower.toFixed(2);
        
        // 更新档把颜色
        updateGearColor();
    }
}

// 吸引附近食物
function attractNearbyFoods() {
    if (snake.length === 0) return;
    
    const headPos = snake[0].position;
    
    // 吸引食物管理器中的所有食物
    for (let i = 0; i < entityManager.foodManager.foods.length; i++) {
        const food = entityManager.foodManager.foods[i];
        const distance = headPos.distanceTo(food.mesh.position);
        
        if (distance < ATTRACTION_DISTANCE) {
            // 计算朝向蛇头的方向
            const direction = new THREE.Vector3().subVectors(headPos, food.mesh.position).normalize();
            
            // 根据距离计算吸引力强度
            const strength = ATTRACTION_SPEED * (1 - distance / ATTRACTION_DISTANCE);
            
            // 应用吸引力
            food.mesh.position.add(direction.multiplyScalar(strength));
        }
    }
}

// 动画循环
function animate(timestamp) {
    requestAnimationFrame(animate);
    
    // 处理键盘输入
    handleKeyboardInput();
    
    // 更新游戏状态
    if (gameRunning) {
        // 更新方向向量
        updateDirectionVector();
        
        // 更新移动
        if (isMoving) {
            updateMove(timestamp);
        }
        
        // 更新实体
        entityManager.update(timestamp);
        
        // 蛇头呼吸效果
        if (snake.length > 0) {
            const head = snake[0];
            const scale = 1 + Math.sin(timestamp * 0.003) * 0.1;
            head.scale.set(scale, scale, scale);
        }
        
        // 更新光柱
        updatePathCylinder();
        
        // 更新小地图
        updateMiniMap();
        
        // 更新相机
        if (firstPersonMode) {
            updateFirstPersonCamera();
        } else {
            updateThirdPersonCamera();
        }
        
        // 吸引附近食物
        attractNearbyFoods();
        
        // 更新天空盒
        updateSkybox();
    }
    
    // 更新控件
    if (controls.enabled) {
        controls.update();
    }
    
    // 渲染场景
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

// 设置摇杆容器拖动功能
function setupJoystickDrag() {
    const joystickContainer = document.getElementById('joystickContainer');
    let isDragging = false;
    let startX, startY;
    let startLeft, startBottom;

    // 鼠标事件
    joystickContainer.addEventListener('mousedown', function(e) {
        // 仅当点击在容器上但不是摇杆头时才拖动
        if (e.target !== joystickContainer && !e.target.classList.contains('drag-handle')) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // 获取当前位置
        startLeft = parseFloat(joystickContainer.style.left) || 60;
        startBottom = parseFloat(joystickContainer.style.bottom) || 60;
        
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = startY - e.clientY;
        
        // 计算新位置
        let newLeft = startLeft + deltaX;
        let newBottom = startBottom - deltaY;
        
        // 边界检查
        newLeft = Math.max(10, Math.min(window.innerWidth - joystickContainer.offsetWidth - 10, newLeft));
        newBottom = Math.max(10, Math.min(window.innerHeight - joystickContainer.offsetHeight - 10, newBottom));
        
        // 应用新位置
        joystickContainer.style.left = newLeft + 'px';
        joystickContainer.style.bottom = newBottom + 'px';
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });

    // 触摸事件
    joystickContainer.addEventListener('touchstart', function(e) {
        // 仅当点击在容器上但不是摇杆头时才拖动
        if (e.target !== joystickContainer && !e.target.classList.contains('drag-handle')) {
            return;
        }
        
        if (e.touches.length === 1) {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            startLeft = parseFloat(joystickContainer.style.left) || 60;
            startBottom = parseFloat(joystickContainer.style.bottom) || 60;
            
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        let newLeft = startLeft + deltaX;
        let newBottom = startBottom - deltaY;
        
        // 边界检查
        newLeft = Math.max(10, Math.min(window.innerWidth - joystickContainer.offsetWidth - 10, newLeft));
        newBottom = Math.max(10, Math.min(window.innerHeight - joystickContainer.offsetHeight - 10, newBottom));
        
        joystickContainer.style.left = newLeft + 'px';
        joystickContainer.style.bottom = newBottom + 'px';
        
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', function() {
        isDragging = false;
    });
}

// 初始化游戏
window.onload = function() {
    init();
    updateDirectionVector();
    updateGearColor();
    updateJoystickDisplay();
    
    // 修复：确保游戏开始时canvas获得焦点
    document.getElementById('gameCanvas').focus();
    
    // 设置第一人称模式为默认
    if (snake.length > 0) {
        snake[0].visible = false;
    }
    controls.enabled = false;
    if (pathCylinder) {
        pathCylinder.material = pathCylinderWireMaterial;
    }
    
    // 修复：确保第一人称模式的UI元素正确显示
    document.getElementById('fpIndicator').style.display = 'block';
    
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('touchControls').style.display = 'block';
    
    // 尝试自动播放音乐（需要用户交互）
    document.addEventListener('click', function initMusic() {
        if (!musicPlaying) {
            bgm.play().then(() => {
                musicPlaying = true;
                musicButton.textContent = '🔊';
            }).catch(e => {
                console.log("音乐自动播放失败，需要用户手动点击:", e);
            });
        }
        document.removeEventListener('click', initMusic);
    });
};