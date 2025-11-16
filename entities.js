// entities.js - 完整实体模块代码，与game.js完全兼容

// 基础游戏实体类
class GameEntity {
    constructor() {
        if (new.target === GameEntity) {
            throw new Error("GameEntity is an abstract class and cannot be instantiated directly.");
        }
    }
    
    update() {
        throw new Error("Method 'update()' must be implemented.");
    }
    
    dispose() {
        throw new Error("Method 'dispose()' must be implemented.");
    }
}

// 食物类
class Food extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.mesh = null;
        this.create();
    }
    
    create() {
        const geometry = new THREE.SphereGeometry(8, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xff5555,
            shininess: 10,
            emissive: 0xaa0000,
            emissiveIntensity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 随机位置
        this.randomizePosition();
        
        // 标记为可见
        this.mesh.userData = { visible: true };
        
        this.scene.add(this.mesh);
    }
    
    randomizePosition() {
        this.mesh.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
    }
    
    update() {
        // 食物旋转动画
        this.mesh.rotation.x += 0.008;
        this.mesh.rotation.y += 0.012;
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

// 液态食物类 - 增强版
class LiquidFood extends Food {
    constructor(scene, worldSize) {
        super(scene, worldSize);
    }
    
    create() {
        // 创建更复杂的液态食物几何体
        const geometry = this.createLiquidGeometry();
        
        // 创建液态食物的材质
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
            transparent: true,
            opacity: 0.8,
            shininess: 90,
            emissive: new THREE.Color().setHSL(Math.random(), 0.5, 0.4),
            emissiveIntensity: 0.4,
            specular: new THREE.Color(0xffffff),
            
            metalness: 0.1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 随机位置
        this.randomizePosition();
        
        // 标记为可见
        this.mesh.userData = { 
            visible: true,
            flowSpeed: Math.random() * 0.02 + 0.01,
            flowDirection: new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize(),
            timeOffset: Math.random() * 1000,
            pulseSpeed: Math.random() * 0.005 + 0.003,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            )
        };
        
        this.scene.add(this.mesh);
    }
    
    // 使用分形噪声创建更复杂的液态几何体
    createLiquidGeometry() {
        const segments = 16;
        const geometry = new THREE.SphereGeometry(10, segments, segments);
        
        // 应用分形噪声使表面不规则
        const positionAttribute = geometry.attributes.position;
        const originalPositions = positionAttribute.array.slice();
        
        // 应用多层级分形噪声
        for (let i = 0; i < positionAttribute.count; i++) {
            const x = originalPositions[i * 3];
            const y = originalPositions[i * 3 + 1];
            const z = originalPositions[i * 3 + 2];
            
            // 计算原始球体法线
            const normal = new THREE.Vector3(x, y, z).normalize();
            
            // 应用分形噪声
            let noise = 0;
            let frequency = 1.0;
            let amplitude = 1.0;
            
            for (let j = 0; j < 4; j++) {
                noise += this.fbm(
                    x * frequency, 
                    y * frequency, 
                    z * frequency
                ) * amplitude;
                
                frequency *= 2.0;
                amplitude *= 0.5;
            }
            
            // 应用噪声位移
            const displacement = noise * 2.0;
            positionAttribute.setXYZ(
                i,
                x + normal.x * displacement,
                y + normal.y * displacement,
                z + normal.z * displacement
            );
        }
        
        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    // 分形布朗运动噪声函数
    fbm(x, y, z) {
        // 简化版分形噪声
        return Math.sin(x * 0.5) * Math.cos(y * 0.7) * Math.sin(z * 0.3) +
               Math.sin(x * 1.0) * Math.cos(y * 1.4) * Math.sin(z * 0.6) * 0.5 +
               Math.sin(x * 2.0) * Math.cos(y * 2.8) * Math.sin(z * 1.2) * 0.25;
    }
    
    update(timestamp) {
        // 液态流动效果
        const time = timestamp * 0.001;
        const flow = this.mesh.userData;
        
        // 脉动效果
        const pulse = Math.sin(time * flow.pulseSpeed * 2 + flow.timeOffset) * 0.15 + 1;
        this.mesh.scale.set(pulse, pulse, pulse);
        
        // 颜色变化效果
        const hue = (time * 0.001 + flow.timeOffset * 0.0001) % 1;
        this.mesh.material.color.setHSL(hue, 0.8, 0.6);
        this.mesh.material.emissive.setHSL((hue + 0.5) % 1, 0.5, 0.4);
        
        // 轻微移动效果
        const move = Math.sin(time * flow.flowSpeed + flow.timeOffset) * 0.8;
        this.mesh.position.add(flow.flowDirection.clone().multiplyScalar(move * 0.1));
        
        // 旋转效果
        this.mesh.rotation.x += flow.rotationSpeed.x;
        this.mesh.rotation.y += flow.rotationSpeed.y;
        this.mesh.rotation.z += flow.rotationSpeed.z;
        
        // 边界检查
        if (Math.abs(this.mesh.position.x) > this.worldSize/2 - 20) {
            flow.flowDirection.x *= -1;
            this.mesh.position.x = Math.sign(this.mesh.position.x) * (this.worldSize/2 - 20);
        }
        if (Math.abs(this.mesh.position.y) > this.worldSize/2 - 20) {
            flow.flowDirection.y *= -1;
            this.mesh.position.y = Math.sign(this.mesh.position.y) * (this.worldSize/2 - 20);
        }
        if (Math.abs(this.mesh.position.z) > this.worldSize/2 - 20) {
            flow.flowDirection.z *= -1;
            this.mesh.position.z = Math.sign(this.mesh.position.z) * (this.worldSize/2 - 20);
        }
    }
}

// 食物管理器
class FoodManager {
    constructor(scene, worldSize, count = 900) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.foods = [];
        this.createFoods();
    }
    
    createFoods() {
        // 创建普通食物和液态食物的混合
        for (let i = 0; i < this.count; i++) {
            // 30%的概率创建液态食物（从10%提高）
            if (Math.random() < 0.3) {
                this.foods.push(new LiquidFood(this.scene, this.worldSize));
            } else {
                this.foods.push(new Food(this.scene, this.worldSize));
            }
        }
    }
    
    // 在指定位置添加食物
    addFoodAtPosition(position) {
        // 80%的概率创建普通食物，20%的概率创建液态食物
        let food;
        if (Math.random() < 0.2) {
            food = new LiquidFood(this.scene, this.worldSize);
        } else {
            food = new Food(this.scene, this.worldSize);
        }
        
        food.mesh.position.copy(position);
        this.foods.push(food);
        return food;
    }
    
    update(timestamp) {
        for (let food of this.foods) {
            food.update(timestamp);
        }
    }
    
    checkCollision(headPosition, onCollision) {
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const distance = headPosition.distanceTo(food.mesh.position);
            
            if (distance < 50) {
                onCollision(food, i);
                break;
            }
        }
    }
    
    dispose() {
        for (let food of this.foods) {
            food.dispose();
        }
        this.foods = [];
    }
}

// 障碍物类
class Obstacle extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.mesh = null;
        this.create();
    }
    
    create() {
        const size = Math.random() * 30 + 20;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xaa55ff,
            shininess: 60,
            emissive: 0x5511aa,
            emissiveIntensity: 0.3
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // 随机位置
        this.mesh.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 标记为可见
        this.mesh.userData = { visible: true };
        
        this.scene.add(this.mesh);
    }
    
    update() {
        // 障碍物不需要特殊更新
    }
    
    checkCollision(position) {
        const distance = position.distanceTo(this.mesh.position);
        const obstacleSize = Math.max(
            this.mesh.geometry.parameters.width,
            this.mesh.geometry.parameters.height,
            this.mesh.geometry.parameters.depth
        );
        const collisionThreshold = 6 + (obstacleSize / 2);
        
        return distance < collisionThreshold;
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

// 障碍物管理器
class ObstacleManager {
    constructor(scene, worldSize, count = 15) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.obstacles = [];
        this.createObstacles();
    }
    
    createObstacles() {
        for (let i = 0; i < this.count; i++) {
            this.obstacles.push(new Obstacle(this.scene, this.worldSize));
        }
    }
    
    update() {
        for (let obstacle of this.obstacles) {
            obstacle.update();
        }
    }
    
    checkCollisions(position) {
        for (let obstacle of this.obstacles) {
            if (obstacle.checkCollision(position)) {
                return true;
            }
        }
        return false;
    }
    
    dispose() {
        for (let obstacle of this.obstacles) {
            obstacle.dispose();
        }
        this.obstacles = [];
    }
}

// 小球藻类
class Algae extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.mesh = null;
        this.create();
    }
    
    create() {
        this.mesh = new THREE.Group();
        
        // 创建小球藻主体
        const mainGeometry = new THREE.SphereGeometry(12, 8, 8);
        mainGeometry.scale(
            0.8 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4
        );
        
        // 粗糙材质
        const algaeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x55ff55,
            transparent: true,
            opacity: 0.7,
            shininess: 20,
            emissive: 0x22aa22,
            emissiveIntensity: 0.3
        });
        
        const algaeMesh = new THREE.Mesh(mainGeometry, algaeMaterial);
        algaeMesh.castShadow = true;
        algaeMesh.receiveShadow = true;
        this.mesh.add(algaeMesh);
        
        // 添加絮状效果
        const fluffCount = 2 + Math.floor(Math.random() * 8);
        for (let j = 0; j < fluffCount; j++) {
            const fluffGeometry = new THREE.SphereGeometry(
                2 + Math.random() * 4, 
                6, 
                6
            );
            
            // 随机位置偏移
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 25,
                (Math.random() - 0.5) * 25,
                (Math.random() - 0.5) * 25
            );
            
            const fluffMesh = new THREE.Mesh(fluffGeometry, algaeMaterial);
            fluffMesh.position.copy(offset);
            fluffMesh.castShadow = true;
            fluffMesh.receiveShadow = true;
            this.mesh.add(fluffMesh);
        }
        
        // 随机位置
        this.mesh.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
        
        // 随机漂浮参数
        this.mesh.userData = {
            speed: Math.random() * 0.5 + 0.2,
            direction: new THREE.Vector3(
                Math.random() * 0.1 - 0.05,
                Math.random() * 0.1 - 0.05,
                Math.random() * 0.1 - 0.05
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            ),
            visible: true
        };
        
        this.scene.add(this.mesh);
    }
    
    update() {
        // 更新位置
        this.mesh.position.add(this.mesh.userData.direction);
        
        // 旋转
        this.mesh.rotation.x += this.mesh.userData.rotationSpeed.x;
        this.mesh.rotation.y += this.mesh.userData.rotationSpeed.y;
        this.mesh.rotation.z += this.mesh.userData.rotationSpeed.z;
        
        // 边界检查 - 反弹
        if (Math.abs(this.mesh.position.x) > this.worldSize/2 - 20) {
            this.mesh.userData.direction.x *= -1;
            this.mesh.position.x = Math.sign(this.mesh.position.x) * (this.worldSize/2 - 20);
        }
        if (Math.abs(this.mesh.position.y) > this.worldSize/2 - 20) {
            this.mesh.userData.direction.y *= -1;
            this.mesh.position.y = Math.sign(this.mesh.position.y) * (this.worldSize/2 - 20);
        }
        if (Math.abs(this.mesh.position.z) > this.worldSize/2 - 20) {
            this.mesh.userData.direction.z *= -1;
            this.mesh.position.z = Math.sign(this.mesh.position.z) * (this.worldSize/2 - 20);
        }
    }
    
    checkCollision(headPosition, onCollision) {
        const distance = headPosition.distanceTo(this.mesh.position);
        
        if (distance < 30) {
            onCollision(this);
            return true;
        }
        return false;
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        // 需要遍历所有子网格并处置
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}

// 小球藻管理器
class AlgaeManager {
    constructor(scene, worldSize, count = 200) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.algae = [];
        this.createAlgae();
    }
    
    createAlgae() {
        for (let i = 0; i < this.count; i++) {
            this.algae.push(new Algae(this.scene, this.worldSize));
        }
    }
    
    update() {
        for (let alga of this.algae) {
            alga.update();
        }
    }
    
    checkCollisions(headPosition, onCollision) {
        for (let i = this.algae.length - 1; i >= 0; i--) {
            const alga = this.algae[i];
            if (alga.checkCollision(headPosition, onCollision)) {
                // 从场景中移除小球藻
                this.scene.remove(alga.mesh);
                this.algae.splice(i, 1);
                break;
            }
        }
    }
    
    dispose() {
        for (let alga of this.algae) {
            alga.dispose();
        }
        this.algae = [];
    }
}

// 海带类
class Kelp extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.mesh = null;
        this.create();
    }
    
    create() {
        this.mesh = new THREE.Group();
        
        // 创建海带茎
        const stemGeometry = new THREE.CylinderGeometry(1.8, 2.0, 100, 12, 32);
        const stemMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x5533cc,
            shininess: 60,
            emissive: 0x331188,
            emissiveIntensity: 0.3
        });
        
        // 扭曲茎干
        const positionAttribute = stemGeometry.attributes.position;
        for (let j = 0; j < positionAttribute.count; j++) {
            const y = positionAttribute.getY(j);
            const twistAmount = Math.sin(y * 0.1) * 7;
            positionAttribute.setX(j, positionAttribute.getX(j) + twistAmount);
        }
        
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 50;
        this.mesh.add(stem);
        
        // 创建叶片材质
        const leafMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8855ff,
            shininess: 40,
            emissive: 0x5533cc,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        
        // 创建多层叶片
        for (let j = 0; j < 6; j++) {
            const layerHeight = j * 15;
            
            // 创建主叶片
            const leafGeometry = new THREE.PlaneGeometry(35, 16, 16, 4);
            
            // 弯曲叶片
            const positions = leafGeometry.attributes.position.array;
            for (let k = 0; k < positions.length; k += 3) {
                const y = positions[k + 1];
                const bend = Math.sin((y + 8) * 0.3) * 8;
                positions[k] += bend;
            }
            leafGeometry.attributes.position.needsUpdate = true;
            
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.y = layerHeight;
            leaf.rotation.x = Math.PI / 2;
            
            // 随机旋转角度
            const rotationAngle = (j % 2 === 0 ? 1 : -1) * (Math.PI / 4 + Math.random() * 0.2);
            leaf.rotation.z = rotationAngle;
            
            // 存储原始值用于动画
            leaf.userData = {
                originalX: leaf.position.x,
                originalY: leaf.position.y,
                originalRotationZ: leaf.rotation.z
            };
            
            this.mesh.add(leaf);
            
            // 添加对称叶片
            const leaf2 = leaf.clone();
            leaf2.rotation.z = -rotationAngle;
            
            // 存储原始值
            leaf2.userData = {
                originalX: leaf2.position.x,
                originalY: leaf2.position.y,
                originalRotationZ: leaf2.rotation.z
            };
            
            this.mesh.add(leaf2);
            
            // 添加小型侧叶
            for (let s = 0; s < 2; s++) {
                const sideLeafGeometry = new THREE.PlaneGeometry(15, 8, 8, 2);
                
                // 弯曲侧叶
                const sidePositions = sideLeafGeometry.attributes.position.array;
                for (let k = 0; k < sidePositions.length; k += 3) {
                    const y = sidePositions[k + 1];
                    const bend = Math.sin((y + 4) * 0.4) * 4;
                    sidePositions[k] += bend;
                }
                sideLeafGeometry.attributes.position.needsUpdate = true;
                
                const sideLeaf = new THREE.Mesh(sideLeafGeometry, leafMaterial);
                sideLeaf.position.y = layerHeight + 5;
                sideLeaf.position.x = (s === 0 ? -1 : 1) * 15;
                sideLeaf.rotation.x = Math.PI / 2;
                sideLeaf.rotation.z = (s === 0 ? 1 : -1) * (Math.PI / 3 + Math.random() * 0.2);
                
                // 存储原始值
                sideLeaf.userData = {
                    originalX: sideLeaf.position.x,
                    originalY: sideLeaf.position.y,
                    originalRotationZ: sideLeaf.rotation.z
                };
                
                this.mesh.add(sideLeaf);
            }
        }
        
        // 添加顶部装饰
        const topGeometry = new THREE.ConeGeometry(4, 12, 8);
        const topMaterial = new THREE.MeshPhongMaterial({
            color: 0xaa77ff,
            emissive: 0x7744dd,
            emissiveIntensity: 0.3,
            shininess: 50
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 100;
        this.mesh.add(top);
        
        // 随机位置
        this.mesh.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            Math.floor(Math.random() * 100) - 50,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
        
        // 随机缩放
        const scale = 0.7 + Math.random() * 0.6;
        this.mesh.scale.set(scale, scale, scale);
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 摆动参数
        this.mesh.userData = {
            baseRotation: Math.random() * Math.PI * 2,
            swingSpeed: Math.random() * 0.01 + 0.02,
            swingAmplitude: Math.random() * 0.3 + 0.2,
            leafWaveOffset: Math.random() * Math.PI * 2,
            timeOffset: Math.random() * 1000,
            visible: true
        };
        
        this.scene.add(this.mesh);
        
        // 添加气泡效果
        this.createBubbles();
    }
    
    createBubbles() {
        const bubbleGroup = new THREE.Group();
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6,
            shininess: 100,
            emissive: 0x4488ff,
            emissiveIntensity: 0.3
        });
        
        // 创建多个气泡
        for (let i = 0; i < 8; i++) {
            const bubbleGeometry = new THREE.SphereGeometry(1.5 + Math.random() * 1, 8, 8);
            const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
            
            // 随机位置
            const angle = Math.random() * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            const height = Math.random() * 80;
            
            bubble.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            bubble.castShadow = true;
            bubble.receiveShadow = true;
            bubble.userData = {
                speed: 0.5 + Math.random() * 0.1,
                startHeight: height,
                amplitude: 0.5 + Math.random(),
                offset: Math.random() * Math.PI * 2
            };
            
            bubbleGroup.add(bubble);
        }
        
        this.mesh.add(bubbleGroup);
    }
    
    update(timestamp) {
        const time = timestamp * 0.001;
        const t = time + this.mesh.userData.timeOffset * 0.001;
        
        // 整体摆动效果
        this.mesh.rotation.y = this.mesh.userData.baseRotation + 
                             Math.sin(t * this.mesh.userData.swingSpeed) * this.mesh.userData.swingAmplitude;
        
        // 叶片波浪效果
        const leaves = [];
        this.mesh.traverse(child => {
            if (child.isMesh && child.geometry.type === "PlaneGeometry") {
                leaves.push(child);
            }
        });
        
        for (let j = 0; j < leaves.length; j++) {
            const leaf = leaves[j];
            const waveOffset = this.mesh.userData.leafWaveOffset + j * 0.3;
            
            // 波浪效果 - 上下移动
            const waveY = Math.sin(t * 1.5 + waveOffset) * 3;
            
            // 波浪效果 - 左右摆动
            const waveX = Math.sin(t * 1.8 + waveOffset) * 2;
            
            // 应用波浪效果
            leaf.position.y = leaf.userData.originalY + waveY;
            leaf.position.x = leaf.userData.originalX + waveX;
            
            // 轻微旋转变化
            leaf.rotation.z = leaf.userData.originalRotationZ + 
                             Math.sin(t * 2 + waveOffset) * 0.1;
        }
        
        // 更新气泡效果
        const bubbleGroup = this.mesh.children.find(child => child.isGroup);
        if (bubbleGroup) {
            bubbleGroup.children.forEach(bubble => {
                // 气泡上下浮动
                bubble.position.y = bubble.userData.startHeight + 
                                  Math.sin(t * bubble.userData.speed + bubble.userData.offset) * 
                                  bubble.userData.amplitude * 10;
                
                // 气泡旋转
                bubble.rotation.x += 0.01;
                bubble.rotation.y += 0.015;
            });
        }
    }
    
    checkCollision(headPosition, onCollision) {
        const distance = headPosition.distanceTo(this.mesh.position);
        
        if (distance < 50) {
            onCollision(this);
            return true;
        }
        return false;
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        // 需要遍历所有子网格并处置
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}

// 海带管理器
class KelpManager {
    constructor(scene, worldSize, count = 30) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.kelps = [];
        this.createKelps();
    }
    
    createKelps() {
        for (let i = 0; i < this.count; i++) {
            this.kelps.push(new Kelp(this.scene, this.worldSize));
        }
    }
    
    update(timestamp) {
        for (let kelp of this.kelps) {
            kelp.update(timestamp);
        }
    }
    
    checkCollisions(headPosition, onCollision) {
        for (let i = this.kelps.length - 1; i >= 0; i--) {
            const kelp = this.kelps[i];
            if (kelp.checkCollision(headPosition, onCollision)) {
                // 从场景中移除海带
                this.scene.remove(kelp.mesh);
                this.kelps.splice(i, 1);
                break;
            }
        }
    }
    
    dispose() {
        for (let kelp of this.kelps) {
            kelp.dispose();
        }
        this.kelps = [];
    }
}

// 变形虫类
class Amoeba extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.mesh = null;
        this.create();
    }
    
    create() {
        // 创建简单的球体作为变形虫
        const geometry = new THREE.SphereGeometry(15, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xff88ff,
            emissive: 0xaa44aa,
            emissiveIntensity: 0.3
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        this.mesh.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            -200,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
        
        const scale = 0.8 + Math.random() * 0.4;
        this.mesh.scale.set(scale, scale, scale);
        
        this.mesh.userData = {
            pulseSpeed: 0.5 + Math.random() * 0.5,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            ),
            visible: true
        };
        
        this.scene.add(this.mesh);
    }
    
    update(timestamp) {
        // 脉动效果
        const pulse = Math.sin(timestamp * 0.001 * this.mesh.userData.pulseSpeed) * 0.1 + 1;
        this.mesh.scale.set(pulse, pulse, pulse);
        
        // 旋转
        this.mesh.rotation.x += this.mesh.userData.rotationSpeed.x;
        this.mesh.rotation.y += this.mesh.userData.rotationSpeed.y;
        this.mesh.rotation.z += this.mesh.userData.rotationSpeed.z;
    }
    
    checkCollision(headPosition, onCollision) {
        const distance = headPosition.distanceTo(this.mesh.position);
        
        if (distance < 50) {
            onCollision(this);
            return true;
        }
        return false;
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

// 变形虫管理器
class AmoebaManager {
    constructor(scene, worldSize, count = 5) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.amoebas = [];
        this.createAmoebas();
    }
    
    createAmoebas() {
        for (let i = 0; i < this.count; i++) {
            this.amoebas.push(new Amoeba(this.scene, this.worldSize));
        }
    }
    
    update(timestamp) {
        for (let amoeba of this.amoebas) {
            amoeba.update(timestamp);
        }
    }
    
    checkCollisions(headPosition, onCollision) {
        for (let i = this.amoebas.length - 1; i >= 0; i--) {
            const amoeba = this.amoebas[i];
            if (amoeba.checkCollision(headPosition, onCollision)) {
                // 从场景中移除变形虫
                this.scene.remove(amoeba.mesh);
                this.amoebas.splice(i, 1);
                break;
            }
        }
    }
    
    dispose() {
        for (let amoeba of this.amoebas) {
            amoeba.dispose();
        }
        this.amoebas = [];
    }
}

// AI蛇类
class AISnake extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.body = [];
        this.positionHistory = [];
        this.length = 1 + Math.floor(Math.random() * 40);
        this.color = this.getRandomColor();
        this.direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();
        this.speed = Math.random() * 0.5 + 0.8;
        this.turnCounter = 0;
        this.turnInterval = Math.floor(Math.random() * 100) + 50;
        
        this.create();
    }
    
    getRandomColor() {
        const colors = [
            new THREE.Color(0xff0000), // 红色
            new THREE.Color(0xffff00), // 黄色
            new THREE.Color(0xff00ff), // 紫色
            new THREE.Color(0x00ffff), // 青色
            new THREE.Color(0xff8800)  // 橙色
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    create() {
        // 创建AI蛇头 - 比身体更大
        const headGeometry = new THREE.BoxGeometry(15, 15, 15);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: this.color,
            emissive: this.color.clone().multiplyScalar(0.3),
            emissiveIntensity: 0.3
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        
        // 添加眼睛
        const eyeGeometry = new THREE.SphereGeometry(2, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // 左眼
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-4, 3, 7);
        head.add(leftEye);
        
        // 右眼
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(4, 3, 7);
        head.add(rightEye);
        
        // 随机位置
        head.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
        
        head.castShadow = true;
        head.receiveShadow = true;
        this.scene.add(head);
        this.body.push(head);
        
        // 创建初始蛇身
        for (let j = 1; j < this.length; j++) {
            const segmentGeometry = new THREE.BoxGeometry(9, 9, 9);
            const segmentMaterial = new THREE.MeshPhongMaterial({ 
            color: this.color,
            emissive: this.color.clone().multiplyScalar(0.2),
            emissiveIntensity: 0.2
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            
            segment.position.copy(head.position);
            segment.position.x -= this.direction.x * 10 * j;
            segment.position.y -= this.direction.y * 10 * j;
            segment.position.z -= this.direction.z * 10 * j;
            
            segment.castShadow = true;
            segment.receiveShadow = true;
            this.scene.add(segment);
            this.body.push(segment);
        }
    }
    
    update() {
        if (this.body.length === 0) return;
        
        // 随机改变方向
        this.turnCounter++;
        if (this.turnCounter > this.turnInterval) {
            this.direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            this.turnCounter = 0;
            this.turnInterval = Math.floor(Math.random() * 100) + 50;
        }
        
        // 移动AI蛇头
        const head = this.body[0];
        head.position.add(this.direction.clone().multiplyScalar(this.speed));
        
        // 边界检查
        if (Math.abs(head.position.x) > this.worldSize/2 - 10) {
            this.direction.x *= -1;
            head.position.x = Math.sign(head.position.x) * (this.worldSize/2 - 10);
        }
        if (Math.abs(head.position.y) > this.worldSize/2 - 10) {
            this.direction.y *= -1;
            head.position.y = Math.sign(head.position.y) * (this.worldSize/2 - 10);
        }
        if (Math.abs(head.position.z) > this.worldSize/2 - 10) {
            this.direction.z *= -1;
            head.position.z = Math.sign(head.position.z) * (this.worldSize/2 - 10);
        }
        
        // 记录位置历史
        this.positionHistory.unshift(head.position.clone());
        if (this.positionHistory.length > 10000) {
            this.positionHistory.pop();
        }
        
        // 更新AI蛇身
        for (let i = 1; i < this.body.length; i++) {
            const targetIndex = Math.min(this.positionHistory.length - 1, i * 12);
            if (targetIndex < this.positionHistory.length) {
                const targetPosition = this.positionHistory[targetIndex];
                this.body[i].position.lerp(targetPosition, 0.3);
            }
        }
    }
    
    checkCollision(headPosition, onCollision) {
        if (this.body.length === 0) return false;
        
        const aiHead = this.body[0];
        const distance = headPosition.distanceTo(aiHead.position);
        
        if (distance < 20) {
            onCollision(this);
            return true;
        }
        return false;
    }
    
    dispose() {
        for (let segment of this.body) {
            this.scene.remove(segment);
            segment.geometry.dispose();
            segment.material.dispose();
        }
        this.body = [];
    }
}

// AI蛇管理器
class AISnakeManager {
    constructor(scene, worldSize, count = 60) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.aiSnakes = [];
        this.createAISnakes();
    }
    
    createAISnakes() {
        for (let i = 0; i < this.count; i++) {
            this.aiSnakes.push(new AISnake(this.scene, this.worldSize));
        }
    }
    
    update() {
        for (let aiSnake of this.aiSnakes) {
            aiSnake.update();
        }
    }
    
    checkCollisions(headPosition, onCollision) {
        for (let i = this.aiSnakes.length - 1; i >= 0; i--) {
            const aiSnake = this.aiSnakes[i];
            if (aiSnake.checkCollision(headPosition, onCollision)) {
                // 从场景中移除AI蛇
                for (let segment of aiSnake.body) {
                    this.scene.remove(segment);
                }
                this.aiSnakes.splice(i, 1);
                break;
            }
        }
    }
    
    dispose() {
        for (let aiSnake of this.aiSnakes) {
            aiSnake.dispose();
        }
        this.aiSnakes = [];
    }
}

// 分形植物类
class FractalPlant extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.mesh = null;
        this.create();
    }
    
    create() {
        this.mesh = new THREE.Group();
        
        // 使用L系统生成分形植物
        this.generateFractalPlant();
        
        // 随机位置
        this.mesh.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            Math.floor(Math.random() * 100) - 50,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
        
        // 随机缩放
        const scale = 0.5 + Math.random() * 1.0;
        this.mesh.scale.set(scale, scale, scale);
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 动画参数
        this.mesh.userData = {
            timeOffset: Math.random() * 1000,
            swingSpeed: Math.random() * 0.01 + 0.005,
            swingAmplitude: Math.random() * 0.2 + 0.1,
            visible: true
        };
        
        this.scene.add(this.mesh);
    }
    
    // 使用L系统生成分形植物
    generateFractalPlant() {
        // L系统规则
        const axiom = "X";
        const rules = {
            "X": "F+[[X]-X]-F[-FX]+X",
            "F": "FF"
        };
        
        // 生成字符串
        let result = axiom;
        for (let i = 0; i < 4; i++) {
            let newStr = "";
            for (let j = 0; j < result.length; j++) {
                const char = result[j];
                newStr += rules[char] || char;
            }
            result = newStr;
        }
        
        // 解释L系统字符串并创建几何体
        this.interpretLSystem(result);
    }
    
    // 解释L系统字符串并创建几何体
    interpretLSystem(lSystemString) {
        const stack = [];
        let currentPosition = new THREE.Vector3(0, 0, 0);
        let currentDirection = new THREE.Vector3(0, 1, 0);
        let currentRotation = new THREE.Vector3(0, 0, 0);
        
        const leafMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(0.3 + Math.random() * 0.2, 0.8, 0.5),
            shininess: 40,
            side: THREE.DoubleSide
        });
        
        const stemMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.8, 0.4),
            shininess: 30
        });
        
        for (let i = 0; i < lSystemString.length; i++) {
            const char = lSystemString[i];
            
            switch (char) {
                case 'F': // 向前移动并绘制茎
                    const stemLength = 5 + Math.random() * 3;
                    const stemGeometry = new THREE.CylinderGeometry(
                        0.5, 1.0, stemLength, 8
                    );
                    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                    
                    stem.position.copy(currentPosition);
                    stem.position.add(currentDirection.clone().multiplyScalar(stemLength / 2));
                    
                    stem.lookAt(currentPosition.clone().add(currentDirection));
                    stem.rotateX(Math.PI / 2);
                    
                    this.mesh.add(stem);
                    
                    currentPosition.add(currentDirection.clone().multiplyScalar(stemLength));
                    break;
                    
                case '+': // 向右转
                    currentDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 8);
                    break;
                    
                case '-': // 向左转
                    currentDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 8);
                    break;
                    
                case '[': // 保存状态
                    stack.push({
                        position: currentPosition.clone(),
                        direction: currentDirection.clone(),
                        rotation: currentRotation.clone()
                    });
                    break;
                    
                case ']': // 恢复状态
                    if (stack.length > 0) {
                        const state = stack.pop();
                        currentPosition = state.position;
                        currentDirection = state.direction;
                        currentRotation = state.rotation;
                        
                        // 在分支末端添加叶子
                        this.addLeaf(currentPosition, leafMaterial);
                    }
                    break;
            }
        }
    }
    
    // 添加叶子
    addLeaf(position, material) {
        if (Math.random() > 0.3) return; // 只有30%的概率添加叶子
        
        const leafSize = 2 + Math.random() * 3;
        const leafGeometry = new THREE.CircleGeometry(leafSize, 5);
        
        // 使叶子更自然
        const vertices = leafGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const distance = Math.sqrt(x * x + y * y);
            const noise = Math.sin(distance * 2) * 0.5;
            vertices[i + 2] = noise;
        }
        leafGeometry.attributes.position.needsUpdate = true;
        leafGeometry.computeVertexNormals();
        
        const leaf = new THREE.Mesh(leafGeometry, material);
        leaf.position.copy(position);
        
        // 随机旋转叶子
        leaf.rotation.x = Math.random() * Math.PI;
        leaf.rotation.y = Math.random() * Math.PI;
        leaf.rotation.z = Math.random() * Math.PI;
        
        this.mesh.add(leaf);
    }
    
    update(timestamp) {
        const time = timestamp * 0.001 + this.mesh.userData.timeOffset;
        
        // 植物摆动效果
        this.mesh.rotation.z = Math.sin(time * this.mesh.userData.swingSpeed) * 
                              this.mesh.userData.swingAmplitude;
    }
    
    checkCollision(headPosition, onCollision) {
        const distance = headPosition.distanceTo(this.mesh.position);
        
        if (distance < 60) {
            onCollision(this);
            return true;
        }
        return false;
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}

// 斐波那契生命体类
class FibonacciCreature extends GameEntity {
    constructor(scene, worldSize) {
        super();
        this.scene = scene;
        this.worldSize = worldSize;
        this.mesh = null;
        this.create();
    }
    
    create() {
        this.mesh = new THREE.Group();
        
        // 使用斐波那契数列创建生命体
        this.generateFibonacciCreature();
        
        // 随机位置
        this.mesh.position.set(
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            Math.floor(Math.random() * this.worldSize) - this.worldSize/2,
            -(Math.floor(Math.random() * this.worldSize) - this.worldSize/2)
        );
        
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 动画参数
        this.mesh.userData = {
            timeOffset: Math.random() * 1000,
            pulseSpeed: Math.random() * 0.005 + 0.003,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            ),
            visible: true
        };
        
        this.scene.add(this.mesh);
    }
    
    // 使用斐波那契数列创建生命体
    generateFibonacciCreature() {
        // 生成斐波那契数列
        const fibSequence = this.generateFibonacci(10);
        
        // 使用斐波那契数列创建螺旋结构
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // 黄金角度
        
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
            shininess: 80,
            emissive: new THREE.Color().setHSL((Math.random() + 0.5) % 1, 0.5, 0.3),
            emissiveIntensity: 0.3
        });
        
        for (let i = 0; i < fibSequence.length; i++) {
            const radius = fibSequence[i] * 0.5;
            const angle = i * goldenAngle;
            
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = i * 2 - fibSequence.length;
            
            // 创建球体
            const sphereGeometry = new THREE.SphereGeometry(radius, 12, 12);
            const sphere = new THREE.Mesh(sphereGeometry, material);
            sphere.position.set(x, y, z);
            
            // 添加触手/分支
            if (i > 0 && i % 3 === 0) {
                this.addTentacle(sphere.position, radius, material);
            }
            
            this.mesh.add(sphere);
        }
    }
    
    // 生成斐波那契数列
    generateFibonacci(n) {
        const sequence = [1, 1];
        for (let i = 2; i < n; i++) {
            sequence[i] = sequence[i - 1] + sequence[i - 2];
        }
        return sequence;
    }
    
    // 添加触手/分支
    addTentacle(position, baseRadius, material) {
        const tentacleLength = 5 + Math.random() * 10;
        const segments = 5 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < segments; i++) {
            const radius = baseRadius * (1 - i / segments);
            const segmentLength = tentacleLength / segments;
            
            const segmentGeometry = new THREE.CylinderGeometry(radius, radius, segmentLength, 8);
            const segment = new THREE.Mesh(segmentGeometry, material);
            
            // 位置和旋转
            segment.position.copy(position);
            segment.position.y += i * segmentLength;
            
            // 随机弯曲
            const bend = (Math.random() - 0.5) * 0.5;
            segment.rotation.z = bend;
            
            this.mesh.add(segment);
        }
    }
    
    update(timestamp) {
        const time = timestamp * 0.001 + this.mesh.userData.timeOffset;
        
        // 脉动效果
        const pulse = Math.sin(time * this.mesh.userData.pulseSpeed) * 0.1 + 1;
        this.mesh.scale.set(pulse, pulse, pulse);
        
        // 旋转
        this.mesh.rotation.x += this.mesh.userData.rotationSpeed.x;
        this.mesh.rotation.y += this.mesh.userData.rotationSpeed.y;
        this.mesh.rotation.z += this.mesh.userData.rotationSpeed.z;
        
        // 颜色变化
        const hue = (time * 0.001) % 1;
        this.mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.color.setHSL(hue, 0.8, 0.6);
                child.material.emissive.setHSL((hue + 0.5) % 1, 0.5, 0.3);
            }
        });
    }
    
    checkCollision(headPosition, onCollision) {
        const distance = headPosition.distanceTo(this.mesh.position);
        
        if (distance < 50) {
            onCollision(this);
            return true;
        }
        return false;
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}

// 分形植物管理器
class FractalPlantManager {
    constructor(scene, worldSize, count = 20) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.plants = [];
        this.createPlants();
    }
    
    createPlants() {
        for (let i = 0; i < this.count; i++) {
            this.plants.push(new FractalPlant(this.scene, this.worldSize));
        }
    }
    
    update(timestamp) {
        for (let plant of this.plants) {
            plant.update(timestamp);
        }
    }
    
    checkCollisions(headPosition, onCollision) {
        for (let i = this.plants.length - 1; i >= 0; i--) {
            const plant = this.plants[i];
            if (plant.checkCollision(headPosition, onCollision)) {
                this.scene.remove(plant.mesh);
                this.plants.splice(i, 1);
                break;
            }
        }
    }
    
    dispose() {
        for (let plant of this.plants) {
            plant.dispose();
        }
        this.plants = [];
    }
}

// 斐波那契生命体管理器
class FibonacciCreatureManager {
    constructor(scene, worldSize, count = 15) {
        this.scene = scene;
        this.worldSize = worldSize;
        this.count = count;
        this.creatures = [];
        this.createCreatures();
    }
    
    createCreatures() {
        for (let i = 0; i < this.count; i++) {
            this.creatures.push(new FibonacciCreature(this.scene, this.worldSize));
        }
    }
    
    update(timestamp) {
        for (let creature of this.creatures) {
            creature.update(timestamp);
        }
    }
    
    checkCollisions(headPosition, onCollision) {
        for (let i = this.creatures.length - 1; i >= 0; i--) {
            const creature = this.creatures[i];
            if (creature.checkCollision(headPosition, onCollision)) {
                this.scene.remove(creature.mesh);
                this.creatures.splice(i, 1);
                break;
            }
        }
    }
    
    dispose() {
        for (let creature of this.creatures) {
            creature.dispose();
        }
        this.creatures = [];
    }
}

// 实体管理器 - 增强版
class EntityManager {
    constructor(scene, worldSize) {
        this.scene = scene;
        this.worldSize = worldSize;
        
        this.foodManager = new FoodManager(scene, worldSize, 900);
        this.obstacleManager = new ObstacleManager(scene, worldSize, 15);
        this.algaeManager = new AlgaeManager(scene, worldSize, 200);
        this.kelpManager = new KelpManager(scene, worldSize, 30);
        this.amoebaManager = new AmoebaManager(scene, worldSize, 5);
        this.aiSnakeManager = new AISnakeManager(scene, worldSize, 60);
        this.fractalPlantManager = new FractalPlantManager(scene, worldSize, 20);
        this.fibonacciCreatureManager = new FibonacciCreatureManager(scene, worldSize, 15);
    }
    
    update(timestamp) {
        this.foodManager.update(timestamp);
        this.obstacleManager.update();
        this.algaeManager.update();
        this.kelpManager.update(timestamp);
        this.amoebaManager.update(timestamp);
        this.aiSnakeManager.update();
        this.fractalPlantManager.update(timestamp);
        this.fibonacciCreatureManager.update(timestamp);
    }
    
    checkCollisions(headPosition, onFoodCollision, onAlgaeCollision, onKelpCollision, 
                   onAmoebaCollision, onAISnakeCollision, onPlantCollision, onCreatureCollision) {
        this.foodManager.checkCollision(headPosition, onFoodCollision);
        this.algaeManager.checkCollisions(headPosition, onAlgaeCollision);
        this.kelpManager.checkCollisions(headPosition, onKelpCollision);
        this.amoebaManager.checkCollisions(headPosition, onAmoebaCollision);
        this.aiSnakeManager.checkCollisions(headPosition, onAISnakeCollision);
        this.fractalPlantManager.checkCollisions(headPosition, onPlantCollision);
        this.fibonacciCreatureManager.checkCollisions(headPosition, onCreatureCollision);
    }
    
    checkObstacleCollisions(position) {
        return this.obstacleManager.checkCollisions(position);
    }
    
    // 获取所有需要在小地图上显示的实体
    getMinimapEntities(headPosition) {
        const entities = [];
        const yThreshold = 40; // Y轴阈值

        // 添加食物
        for (const food of this.foodManager.foods) {
            if (Math.abs(food.mesh.position.y - headPosition.y) <= yThreshold) {
                entities.push({
                    type: 'food',
                    position: food.mesh.position,
                    color: '#ff5555',
                    size: 2
                });
            }
        }

        // 添加障碍物
        for (const obstacle of this.obstacleManager.obstacles) {
            if (Math.abs(obstacle.mesh.position.y - headPosition.y) <= yThreshold) {
                entities.push({
                    type: 'obstacle',
                    position: obstacle.mesh.position,
                    color: '#aa55ff',
                    size: 3
                });
            }
        }

        // 添加小球藻
        for (const alga of this.algaeManager.algae) {
            if (Math.abs(alga.mesh.position.y - headPosition.y) <= yThreshold) {
                entities.push({
                    type: 'algae',
                    position: alga.mesh.position,
                    color: '#55ff55',
                    size: 2
                });
            }
        }

        // 添加海带
        for (const kelp of this.kelpManager.kelps) {
            if (Math.abs(kelp.mesh.position.y - headPosition.y) <= yThreshold) {
                entities.push({
                    type: 'kelp',
                    position: kelp.mesh.position,
                    color: '#8855ff',
                    size: 2
                });
            }
        }

        // 添加变形虫
        for (const amoeba of this.amoebaManager.amoebas) {
            if (Math.abs(amoeba.mesh.position.y - headPosition.y) <= yThreshold) {
                entities.push({
                    type: 'amoeba',
                    position: amoeba.mesh.position,
                    color: '#ff88ff',
                    size: 3
                });
            }
        }

        // 添加AI蛇
        for (const aiSnake of this.aiSnakeManager.aiSnakes) {
            if (aiSnake.body.length > 0) {
                // 检查AI蛇头部是否在Y阈值内
                if (Math.abs(aiSnake.body[0].position.y - headPosition.y) <= yThreshold) {
                    const segments = [];
                    for (const segment of aiSnake.body) {
                        segments.push(segment.position);
                    }

                    entities.push({
                        type: 'aiSnake',
                        position: aiSnake.body[0].position,
                        color: '#ff0000',
                        size: 4,
                        segments: segments
                    });
                }
            }
        }

        // 添加分形植物
        for (const plant of this.fractalPlantManager.plants) {
            if (Math.abs(plant.mesh.position.y - headPosition.y) <= yThreshold) {
                entities.push({
                    type: 'fractalPlant',
                    position: plant.mesh.position,
                    color: '#33aa33',
                    size: 3
                });
            }
        }

        // 添加斐波那契生命体
        for (const creature of this.fibonacciCreatureManager.creatures) {
            if (Math.abs(creature.mesh.position.y - headPosition.y) <= yThreshold) {
                entities.push({
                    type: 'fibonacciCreature',
                    position: creature.mesh.position,
                    color: '#ffaa00',
                    size: 4
                });
            }
        }

        return entities;
    }
    
    dispose() {
        this.foodManager.dispose();
        this.obstacleManager.dispose();
        this.algaeManager.dispose();
        this.kelpManager.dispose();
        this.amoebaManager.dispose();
        this.aiSnakeManager.dispose();
        this.fractalPlantManager.dispose();
        this.fibonacciCreatureManager.dispose();
    }
}