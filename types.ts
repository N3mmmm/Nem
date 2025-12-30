export interface Weapon {
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  recoil: number; // upward camera kick
  range: number;
  ammoCapacity: number;
  color: string;
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  inventory: Weapon[];
  currentWeaponIndex: number;
  score: number;
}

export interface GameSettings {
  sensitivity: number;
  volume: number;
  graphics: 'low' | 'high';
  shadows: boolean;
}

export interface EnemyData {
  id: string;
  position: [number, number, number];
  health: number;
  isDead: boolean;
}

export interface LootItem {
  id: string;
  type: 'weapon' | 'medkit' | 'ammo';
  position: [number, number, number];
  name: string;
  value: any; // Could be a Weapon object or health amount
}