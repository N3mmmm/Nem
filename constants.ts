import { Weapon } from './types';

export const MAP_SIZE = 200;
export const ZONE_SHRINK_SPEED = 0.5;
export const INITIAL_ZONE_RADIUS = 90;
export const PLAYER_SPEED = 5;
export const PLAYER_RUN_SPEED = 9;
export const JUMP_FORCE = 6; // Increased slightly for better feedback
export const GRAVITY = 15;   // Increased gravity for snappier fall

// TERRAIN GENERATION CONFIG
const ISLAND_RADIUS = 85;

export const getTerrainHeight = (x: number, z: number): number => {
  const dist = Math.sqrt(x * x + z * z);
  const townFalloff = Math.min(1, Math.max(0, (dist - 20) / 20));

  let noise = 0;
  noise += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 4; 
  noise += Math.sin(x * 0.15 + 10) * Math.cos(z * 0.15 + 10) * 1.5; 
  
  let height = noise * townFalloff;

  if (dist > ISLAND_RADIUS) {
    height -= (dist - ISLAND_RADIUS) * 1.5;
  }
  return height;
};

// DEFINING STATIC OBSTACLES FOR SHARED PHYSICS & RENDERING
// { position: [x, y, z], size: [w, h, d] }
// NOTE: y is the CENTER of the box. So if height is 4, y should be floor + 2.
export const OBSTACLES = [
  { position: [10, 2, 5], size: [6, 4, 6] },   // Concrete Block
  { position: [-15, 4, 10], size: [4, 8, 4] }, // Tower Base
  { position: [-5, 2, -15], size: [3, 4, 3] }, // Crate stack
  { position: [20, 1.5, -5], size: [8, 3, 1] }, // Wall
  { position: [22, 1.5, 5], size: [1, 3, 8] },  // Wall
];

// Helper: Get the highest point at x,z (Terrain OR Object)
export const getElevation = (x: number, z: number): number => {
  let y = getTerrainHeight(x, z);

  // Check if standing on an obstacle
  for (const obj of OBSTACLES) {
    const halfW = obj.size[0] / 2;
    const halfD = obj.size[2] / 2;
    const halfH = obj.size[1] / 2;
    
    // Check bounds
    if (x >= obj.position[0] - halfW && x <= obj.position[0] + halfW &&
        z >= obj.position[2] - halfD && z <= obj.position[2] + halfD) {
      // If we are here, the "ground" is the top of the object
      const objTop = obj.position[1] + halfH;
      y = Math.max(y, objTop);
    }
  }
  return y;
};

// Helper: Check horizontal collision with obstacles
// Returns TRUE if blocked
export const checkCollision = (x: number, z: number, currentY: number): boolean => {
  const playerRadius = 0.5; // Treat player as a cylinder

  for (const obj of OBSTACLES) {
    const halfW = obj.size[0] / 2 + playerRadius; // Expand box by player radius
    const halfD = obj.size[2] / 2 + playerRadius;
    const halfH = obj.size[1] / 2;
    
    // Check Y range: Can only collide if player is vertically overlapping the object (not above it)
    const objBottom = obj.position[1] - halfH;
    const objTop = obj.position[1] + halfH;
    
    // We only collide horizontally if our feet (currentY - 2) or head are within the object's height
    // Player height approx 2 units.
    const feetY = currentY - 1.8; 
    
    // If we are completely above the object, we don't collide horizontally (we walk on it)
    if (feetY >= objTop - 0.1) continue; 

    if (x > obj.position[0] - halfW && x < obj.position[0] + halfW &&
        z > obj.position[2] - halfD && z < obj.position[2] + halfD) {
      return true;
    }
  }
  return false;
};

export const WEAPONS: Record<string, Weapon> = {
  PISTOL: {
    name: 'G18',
    damage: 15,
    fireRate: 400,
    recoil: 0.02,
    range: 50,
    ammoCapacity: 15,
    color: '#94a3b8'
  },
  RIFLE: {
    name: 'AK-47',
    damage: 30,
    fireRate: 120,
    recoil: 0.05,
    range: 200,
    ammoCapacity: 30,
    color: '#f59e0b'
  }
};

export const INITIAL_ENEMIES = [
  { id: '1', position: [10, 1, 10], health: 100 },
  { id: '2', position: [-15, 1, -20], health: 100 },
  { id: '3', position: [20, 1, -10], health: 100 },
  { id: '4', position: [-5, 1, 25], health: 100 },
] as const;

export const INITIAL_LOOT = [
  { id: 'l1', type: 'weapon', position: [5, 0.5, 5], name: 'AK-47', value: WEAPONS.RIFLE },
  { id: 'l2', type: 'medkit', position: [-10, 0.5, -5], name: 'Medkit', value: 50 },
  { id: 'l3', type: 'ammo', position: [2, 0.5, 8], name: 'Ammo Pack', value: 30 },
] as const;