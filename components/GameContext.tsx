import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { PlayerState, GameSettings, EnemyData, LootItem, Weapon } from '../types';
import { WEAPONS, INITIAL_ENEMIES, INITIAL_LOOT } from '../constants';

interface GameContextType {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  enemies: EnemyData[];
  damageEnemy: (id: string, amount: number) => void;
  zoneRadius: number;
  setZoneRadius: (r: number) => void;
  lootItems: LootItem[];
  removeLootItem: (id: string) => void;
  addMessage: (msg: string) => void;
  messages: string[];
  gameOver: boolean;
  setGameOver: (v: boolean) => void;
  playerPosition: React.MutableRefObject<[number, number, number]>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const playerPosition = useRef<[number, number, number]>([0, 2, 0]);
  
  const [settings, setSettings] = useState<GameSettings>({
    sensitivity: 0.5,
    volume: 0.8,
    graphics: 'high',
    shadows: true,
  });

  const [playerState, setPlayerState] = useState<PlayerState>({
    health: 100,
    maxHealth: 100,
    ammo: WEAPONS.PISTOL.ammoCapacity,
    maxAmmo: 90,
    isReloading: false,
    inventory: [WEAPONS.PISTOL],
    currentWeaponIndex: 0,
    score: 0,
  });

  const [enemies, setEnemies] = useState<EnemyData[]>(
    INITIAL_ENEMIES.map(e => ({ ...e, isDead: false, position: [...e.position] as [number, number, number] }))
  );
  
  const [lootItems, setLootItems] = useState<LootItem[]>(
    INITIAL_LOOT.map(l => ({ ...l, position: [...l.position] as [number, number, number] }))
  );

  const [zoneRadius, setZoneRadius] = useState(200);
  const [messages, setMessages] = useState<string[]>([]);

  const addMessage = useCallback((msg: string) => {
    setMessages(prev => [...prev.slice(-4), msg]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m !== msg));
    }, 3000);
  }, []);

  const damageEnemy = useCallback((id: string, amount: number) => {
    setEnemies(prev => prev.map(e => {
      if (e.id === id && !e.isDead) {
        const newHealth = e.health - amount;
        if (newHealth <= 0) {
          addMessage("Enemy Eliminated!");
          setPlayerState(p => ({...p, score: p.score + 1}));
          return { ...e, health: 0, isDead: true };
        }
        return { ...e, health: newHealth };
      }
      return e;
    }));
  }, [addMessage]);

  const removeLootItem = useCallback((id: string) => {
    setLootItems(prev => prev.filter(item => item.id !== id));
  }, []);

  return (
    <GameContext.Provider value={{
      isPlaying,
      setIsPlaying,
      playerState,
      setPlayerState,
      settings,
      setSettings,
      enemies,
      damageEnemy,
      zoneRadius,
      setZoneRadius,
      lootItems,
      removeLootItem,
      addMessage,
      messages,
      gameOver,
      setGameOver,
      playerPosition
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};