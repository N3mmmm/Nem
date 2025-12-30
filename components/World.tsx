import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Box, Billboard, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from './GameContext';
import { MAP_SIZE, ZONE_SHRINK_SPEED, INITIAL_ZONE_RADIUS, getTerrainHeight, OBSTACLES, getElevation } from '../constants';

// --- 1. TERRAIN & WATER ---
const IslandTerrain: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const { geometry, colors } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2, 128, 128);
    const colors = [];
    const count = geo.attributes.position.count;
    
    for (let i = 0; i < count; i++) {
      const x = geo.attributes.position.getX(i);
      const yLocal = geo.attributes.position.getY(i); 
      const height = getTerrainHeight(x, -yLocal);
      
      geo.attributes.position.setZ(i, height);

      if (height < 1.5) {
         colors.push(0.93, 0.88, 0.68); 
      } else {
         const noise = Math.random() * 0.1;
         colors.push(0.1 + noise, 0.5 + noise, 0.2 + noise);
      }
    }
    
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return { geometry: geo, colors };
  }, []);

  return (
    <group>
        <mesh 
            ref={meshRef} 
            geometry={geometry} 
            rotation={[-Math.PI / 2, 0, 0]} 
            receiveShadow 
            castShadow
        >
            <meshStandardMaterial vertexColors roughness={0.8} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
            <planeGeometry args={[MAP_SIZE * 4, MAP_SIZE * 4]} />
            <meshStandardMaterial 
                color="#0ea5e9" 
                transparent 
                opacity={0.8} 
                roughness={0.1} 
                metalness={0.1} 
            />
        </mesh>
    </group>
  );
};

// --- 2. VEGETATION ---
const SimpleTrees: React.FC = () => {
    const trees = useMemo(() => {
        const t = [];
        for (let i = 0; i < 150; i++) {
            const r = Math.random() * 85; 
            const theta = Math.random() * Math.PI * 2;
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            const y = getTerrainHeight(x, z);

            if (y > 1.5 && r > 25) {
                t.push({ x, y, z, scale: 0.8 + Math.random() * 0.4 });
            }
        }
        return t;
    }, []);

    return (
        <group>
            {trees.map((t, i) => (
                <group key={i} position={[t.x, t.y, t.z]} scale={t.scale}>
                    <mesh position={[0, 1, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.2, 0.3, 2, 6]} />
                        <meshStandardMaterial color="#453218" />
                    </mesh>
                    <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
                        <coneGeometry args={[1.5, 3, 7]} />
                        <meshStandardMaterial color="#166534" />
                    </mesh>
                     <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                        <coneGeometry args={[2, 2.5, 7]} />
                        <meshStandardMaterial color="#14532d" />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

const SafeZone: React.FC = () => {
  const { setZoneRadius, isPlaying, gameOver, enemies, damageEnemy } = useGame();
  const radiusRef = useRef(INITIAL_ZONE_RADIUS);

  useFrame((state, delta) => {
    if (!isPlaying || gameOver) return;
    
    if (radiusRef.current > 0) {
      radiusRef.current = Math.max(0, radiusRef.current - (ZONE_SHRINK_SPEED * delta));
      setZoneRadius(radiusRef.current);
    }

    if (Math.random() < 0.05) {
      enemies.forEach(enemy => {
        if (enemy.isDead) return;
        const dist = Math.sqrt(enemy.position[0]**2 + enemy.position[2]**2);
        if (dist > radiusRef.current) {
          damageEnemy(enemy.id, 2); 
        }
      });
    }
  });

  return (
    <group>
      <mesh rotation={[0, 0, 0]} position={[0, 50, 0]}>
        <cylinderGeometry args={[radiusRef.current, radiusRef.current, 100, 64, 1, true]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[radiusRef.current, radiusRef.current + 2, 64]} />
        <meshBasicMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};

const Enemies: React.FC = () => {
  const { enemies } = useGame();

  return (
    <>
      {enemies.map(enemy => {
        if(enemy.isDead) return null;
        // Adjust Enemy Y using getElevation to sit on top of buildings if needed
        const y = getElevation(enemy.position[0], enemy.position[2]);
        
        return (
          <group key={enemy.id} position={[enemy.position[0], y, enemy.position[2]]}>
            <Box args={[1, 2, 1]} position={[0, 1, 0]} castShadow>
              <meshStandardMaterial color="#ef4444" />
            </Box>
            <Sphere args={[0.4]} position={[0, 2.4, 0]}>
              <meshStandardMaterial color="#fee2e2" />
            </Sphere>
            <Billboard position={[0, 3.2, 0]}>
              <Text fontSize={0.4} color="white" anchorX="center" anchorY="middle">
                {enemy.health}%
              </Text>
            </Billboard>
          </group>
        );
      })}
    </>
  );
};

const LootObjects: React.FC = () => {
  const { lootItems } = useGame();

  return (
    <group>
      {lootItems.map(item => {
        const terrainY = getElevation(item.position[0], item.position[2]);
        
        return (
        <group key={item.id} position={[item.position[0], terrainY, item.position[2]]}>
          {item.type === 'weapon' && (
            <Box args={[0.8, 0.2, 0.2]} position={[0, 0.5, 0]} castShadow>
               <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
            </Box>
          )}
          {item.type === 'medkit' && (
            <Box args={[0.5, 0.5, 0.5]} position={[0, 0.5, 0]} castShadow>
               <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
               <Text position={[0, 0, 0.26]} fontSize={0.3} color="white">+</Text>
            </Box>
          )}
           {item.type === 'ammo' && (
            <Box args={[0.3, 0.3, 0.3]} position={[0, 0.5, 0]} castShadow>
               <meshStandardMaterial color="#64748b" emissive="#64748b" emissiveIntensity={0.5} />
            </Box>
          )}
          <Billboard position={[0, 1.2, 0]}>
            <Text fontSize={0.3} color="#fbbf24" anchorX="center" anchorY="middle">
              {item.name}
            </Text>
          </Billboard>
        </group>
      )})}
    </group>
  );
};

export const World: React.FC = () => {
  return (
    <>
      <IslandTerrain />
      <SimpleTrees />
      <SafeZone />
      <Enemies />
      <LootObjects />
      
      {/* RENDER OBSTACLES DYNAMICALLY */}
      {OBSTACLES.map((obj, index) => (
        <Box 
          key={index} 
          args={obj.size as [number, number, number]} 
          position={obj.position as [number, number, number]} 
          castShadow 
          receiveShadow
        >
          <meshStandardMaterial color="#64748b" />
        </Box>
      ))}
    </>
  );
};