import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Raycaster, Group, Euler, Vector2 } from 'three';
import { PointerLockControls, Box, Sphere } from '@react-three/drei';
import { useGame } from './GameContext';
import { PLAYER_SPEED, PLAYER_RUN_SPEED, JUMP_FORCE, WEAPONS, getElevation, checkCollision, GRAVITY } from '../constants';
import { Weapon } from '../types';

export const Player: React.FC = () => {
  const { camera } = useThree();
  const { 
    playerState, 
    setPlayerState, 
    enemies, 
    damageEnemy, 
    lootItems, 
    removeLootItem, 
    addMessage,
    settings,
    zoneRadius,
    setGameOver,
    gameOver,
    playerPosition
  } = useGame();

  const [isLocked, setIsLocked] = useState(false);
  const playerMeshRef = useRef<Group>(null);
  
  // Movement State
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const isRunning = useRef(false);
  const velocity = useRef(new Vector3());
  const direction = useRef(new Vector3());
  
  // Physics State
  const canJump = useRef(false);
  const isGrounded = useRef(false);
  
  // Shooting & Recoil State
  const lastShotTime = useRef(0);
  const isShooting = useRef(false);
  const recoilAccumulator = useRef(0);
  
  const raycaster = useRef(new Raycaster());
  
  // Listen for inputs
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward.current = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft.current = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward.current = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight.current = true; break;
        case 'Space': 
          if (canJump.current) {
            velocity.current.y = JUMP_FORCE;
            canJump.current = false;
            isGrounded.current = false;
          }
          break;
        case 'ShiftLeft': isRunning.current = true; break;
        case 'KeyR': reload(); break;
        case 'KeyF': checkInteraction(); break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward.current = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft.current = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward.current = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight.current = false; break;
        case 'ShiftLeft': isRunning.current = false; break;
      }
    };

    const onMouseDown = () => { isShooting.current = true; };
    const onMouseUp = () => { isShooting.current = false; };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [playerState.currentWeaponIndex, playerState.inventory, lootItems, enemies]);


  const reload = () => {
    const currentWeapon = playerState.inventory[playerState.currentWeaponIndex];
    if (playerState.isReloading || playerState.ammo === currentWeapon.ammoCapacity) return;
    
    setPlayerState(prev => ({ ...prev, isReloading: true }));
    addMessage("Reloading...");
    
    setTimeout(() => {
      setPlayerState(prev => {
        const weapon = prev.inventory[prev.currentWeaponIndex];
        return { 
          ...prev, 
          ammo: weapon.ammoCapacity, 
          isReloading: false 
        };
      });
    }, 2000); 
  };

  const shoot = (weapon: Weapon) => {
    const now = performance.now();
    if (now - lastShotTime.current < weapon.fireRate) return;
    if (playerState.ammo <= 0) {
      addMessage("Out of ammo! Press R");
      return;
    }
    if (playerState.isReloading) return;

    lastShotTime.current = now;
    setPlayerState(prev => ({ ...prev, ammo: prev.ammo - 1 }));
    recoilAccumulator.current += weapon.recoil; 

    raycaster.current.setFromCamera(new Vector2(0, 0), camera);
    
    const aliveEnemies = enemies.filter(e => !e.isDead);
    for (const enemy of aliveEnemies) {
      const enemyPos = new Vector3(...enemy.position);
      // Adjust hitbox to match visual position (standing on ground/box)
      const enemyY = getElevation(enemyPos.x, enemyPos.z);
      enemyPos.y = enemyY + 1;

      const playerPos = camera.position.clone();
      const rayDir = raycaster.current.ray.direction.clone();
      
      const toEnemy = enemyPos.clone().sub(playerPos);
      const dist = toEnemy.length();
      
      if (dist > weapon.range) continue;
      toEnemy.normalize();
      const dot = rayDir.dot(toEnemy);
      
      if (dot > 0.96) {
         damageEnemy(enemy.id, weapon.damage);
         break; 
      }
    }
  };

  const checkInteraction = () => {
    const playerPos = camera.position;
    for (const item of lootItems) {
      const itemPos = new Vector3(...item.position);
      itemPos.y = getElevation(itemPos.x, itemPos.z) + 0.5; // match visual height
      
      if (playerPos.distanceTo(itemPos) < 3) {
        const dirToItem = itemPos.clone().sub(playerPos).normalize();
        const lookDir = new Vector3();
        camera.getWorldDirection(lookDir);
        
        if (dirToItem.dot(lookDir) > 0.8) {
          if (item.type === 'weapon') {
            const newWeapon = item.value as Weapon;
            setPlayerState(prev => ({
              ...prev,
              inventory: [...prev.inventory, newWeapon],
              currentWeaponIndex: prev.inventory.length,
              ammo: newWeapon.ammoCapacity
            }));
            addMessage(`Picked up ${newWeapon.name}`);
          } else if (item.type === 'medkit') {
             setPlayerState(prev => ({ ...prev, health: Math.min(100, prev.health + (item.value as number)) }));
             addMessage("Used Medkit");
          } else if (item.type === 'ammo') {
            setPlayerState(prev => ({ ...prev, ammo: prev.inventory[prev.currentWeaponIndex].ammoCapacity }));
             addMessage("Ammo Refilled");
          }
          removeLootItem(item.id);
          return;
        }
      }
    }
  };

  useFrame((state, delta) => {
    if (isLocked) {
      const speed = isRunning.current ? PLAYER_RUN_SPEED : PLAYER_SPEED;
      const playerHeight = 2.0;
      
      direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
      direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
      direction.current.normalize();

      // Velocity damping (Friction)
      velocity.current.x -= velocity.current.x * 10.0 * delta;
      velocity.current.z -= velocity.current.z * 10.0 * delta;

      if (moveForward.current || moveBackward.current) velocity.current.z -= direction.current.z * 400.0 * delta;
      if (moveLeft.current || moveRight.current) velocity.current.x -= direction.current.x * 400.0 * delta;

      // --- HORIZONTAL MOVEMENT (Split X and Z for sliding) ---
      const nextX = camera.position.x - velocity.current.x * delta * 0.05 * speed;
      const nextZ = camera.position.z + velocity.current.z * delta * 0.05 * speed;

      // Check X Collision
      if (!checkCollision(nextX, camera.position.z, camera.position.y)) {
         camera.position.x = nextX;
      } else {
         velocity.current.x = 0; // Stop momentum against wall
      }

      // Check Z Collision
      if (!checkCollision(camera.position.x, nextZ, camera.position.y)) {
         camera.position.z = nextZ;
      } else {
         velocity.current.z = 0;
      }

      // --- VERTICAL MOVEMENT (Gravity & Ground Snap) ---
      
      // Where is the floor currently? (Terrain OR Obstacle)
      const groundHeight = getElevation(camera.position.x, camera.position.z);
      const playerBottom = camera.position.y - playerHeight;
      
      // Gravity
      velocity.current.y -= GRAVITY * delta;
      
      // Predict next Y
      let nextY = camera.position.y + velocity.current.y * delta;
      
      // Check for landing
      // We add a small buffer (0.1) to prevent flickering when just walking on uneven terrain
      if (nextY - playerHeight <= groundHeight + 0.1 && velocity.current.y <= 0) {
        // Hit ground
        nextY = groundHeight + playerHeight;
        velocity.current.y = 0;
        canJump.current = true;
        isGrounded.current = true;
      } else {
        // In air
        isGrounded.current = false;
        canJump.current = false;
      }
      
      camera.position.y = nextY;

      // Sync refs
      playerPosition.current = [camera.position.x, camera.position.y, camera.position.z];

      // Update TPP Mesh
      if (playerMeshRef.current) {
        const offset = new Vector3(-0.7, -1.8, -4); 
        offset.applyQuaternion(camera.quaternion); 
        const euler = new Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        
        const meshPos = camera.position.clone().add(offset);
        playerMeshRef.current.position.copy(meshPos);
        playerMeshRef.current.rotation.y = euler.y;
      }
    }

    // Zone Damage
    if (Math.random() < 0.05) {
      const dist = Math.sqrt(camera.position.x**2 + camera.position.z**2);
      if (dist > zoneRadius) {
        setPlayerState(p => {
          const newH = p.health - 1;
          if (newH <= 0 && !gameOver) {
            setGameOver(true);
            return { ...p, health: 0 };
          }
          return { ...p, health: newH };
        });
        addMessage("OUTSIDE SAFE ZONE!");
      }
    }

    // Recoil
    if (isShooting.current) {
       shoot(playerState.inventory[playerState.currentWeaponIndex]);
    }
    if (recoilAccumulator.current > 0) {
      camera.rotation.x += recoilAccumulator.current * delta * 10;
      recoilAccumulator.current = Math.max(0, recoilAccumulator.current - delta * 0.1);
    }
  });

  const currentWeaponData = playerState.inventory[playerState.currentWeaponIndex];

  return (
    <>
      <PointerLockControls 
        onLock={() => setIsLocked(true)} 
        onUnlock={() => setIsLocked(false)} 
        selector="#root"
      />
      <group ref={playerMeshRef}>
        <Box args={[0.9, 1.8, 0.5]} position={[0, 0.9, 0]} castShadow>
          <meshStandardMaterial color="#3b82f6" />
        </Box>
        <Sphere args={[0.35]} position={[0, 2, 0]}>
          <meshStandardMaterial color="#fcd34d" />
        </Sphere>
        <Box args={[0.7, 0.9, 0.4]} position={[0, 1.3, 0.35]} castShadow>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        <group position={[0.55, 1.3, 0.6]}>
           <Box args={[0.1, 0.15, 0.8]} position={[0, 0, 0]} castShadow>
              <meshStandardMaterial color={currentWeaponData.color} />
           </Box>
           <Box args={[0.1, 0.2, 0.1]} position={[0, -0.15, 0.2]} castShadow>
              <meshStandardMaterial color="#000" />
           </Box>
        </group>
      </group>
    </>
  );
};