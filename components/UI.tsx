import React, { useEffect, useRef, useState } from 'react';
import { useGame } from './GameContext';
import { WEAPONS, MAP_SIZE } from '../constants';
import { Settings, Map, Crosshair, Heart, Shield, Disc } from 'lucide-react';

const Minimap: React.FC = () => {
  const { playerPosition, enemies, zoneRadius, lootItems } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderMinimap = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const scale = size / (MAP_SIZE * 2.5); // Map scale
      const center = size / 2;

      // Clear
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, size, size);

      // Draw Zone
      ctx.beginPath();
      ctx.arc(center, center, zoneRadius * scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fill();

      // Draw Enemies (Red dots)
      ctx.fillStyle = '#ef4444';
      enemies.forEach(e => {
        if (!e.isDead) {
          const x = center + e.position[0] * scale;
          const y = center + e.position[2] * scale;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      // Draw Loot (Yellow dots)
      ctx.fillStyle = '#fbbf24';
      lootItems.forEach(l => {
          const x = center + l.position[0] * scale;
          const y = center + l.position[2] * scale;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
      });

      // Draw Player (Green Arrow)
      const px = center + playerPosition.current[0] * scale;
      const py = center + playerPosition.current[2] * scale;
      
      ctx.save();
      ctx.translate(px, py);
      // We can't easily get player rotation here without context subscription, so just a dot for now
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const interval = setInterval(renderMinimap, 100);
    return () => clearInterval(interval);
  }, [enemies, zoneRadius, lootItems]); // playerPosition is ref

  return (
    <div className="absolute top-4 left-4 border-2 border-slate-700 bg-black rounded-lg overflow-hidden shadow-lg opacity-90">
      <canvas ref={canvasRef} width={150} height={150} className="block" />
      <div className="absolute bottom-1 right-1 text-xs text-white font-mono bg-black/50 px-1 rounded">
        Press M
      </div>
    </div>
  );
};

const SettingsMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { settings, setSettings } = useGame();
  
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-96 text-white shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6" /> Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Graphics Quality</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setSettings(s => ({...s, graphics: 'low'}))}
                className={`flex-1 py-2 rounded ${settings.graphics === 'low' ? 'bg-blue-600' : 'bg-slate-800'}`}
              >
                Low
              </button>
              <button 
                onClick={() => setSettings(s => ({...s, graphics: 'high'}))}
                className={`flex-1 py-2 rounded ${settings.graphics === 'high' ? 'bg-blue-600' : 'bg-slate-800'}`}
              >
                High
              </button>
            </div>
          </div>

          <div>
             <label className="block text-sm text-slate-400 mb-1">Shadows</label>
             <button 
                onClick={() => setSettings(s => ({...s, shadows: !s.shadows}))}
                className={`w-full py-2 rounded ${settings.shadows ? 'bg-green-600' : 'bg-red-900'}`}
              >
                {settings.shadows ? 'ON' : 'OFF'}
              </button>
          </div>
          
           <div>
             <label className="block text-sm text-slate-400 mb-1">Mouse Sensitivity</label>
             <input 
               type="range" min="0.1" max="2.0" step="0.1"
               value={settings.sensitivity}
               onChange={(e) => setSettings(s => ({...s, sensitivity: parseFloat(e.target.value)}))}
               className="w-full"
             />
          </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-8 w-full py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};

const GameOverScreen: React.FC = () => {
    const { playerState } = useGame();
    return (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center z-50 text-white animate-in fade-in zoom-in duration-300">
            <h1 className="text-6xl font-black mb-4 uppercase tracking-wider">Booyah! / Wasted</h1>
            <p className="text-2xl mb-8">Score: {playerState.score} Kills</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded text-xl shadow-lg">
                Play Again
            </button>
        </div>
    )
}

export const UI: React.FC = () => {
  const { playerState, messages, gameOver } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const currentWeapon = playerState.inventory[playerState.currentWeaponIndex];
  
  if (gameOver) return <GameOverScreen />;

  return (
    <>
      {/* 1. TPP Crosshair - Circle with Dot style for better visibility */}
      <div className="crosshair flex items-center justify-center">
         <div className="w-[4px] h-[4px] bg-white rounded-full shadow-[0_0_2px_black]"></div>
         <div className="absolute w-[24px] h-[24px] border-2 border-white/60 rounded-full box-border"></div>
      </div>

      {/* 2. Minimap */}
      <Minimap />

      {/* 3. Messages */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        {messages.map((msg, i) => (
          <div key={i} className="bg-black/60 text-white px-4 py-1 rounded text-sm animate-pulse font-bold tracking-wide">
            {msg}
          </div>
        ))}
      </div>

      {/* 4. Player Stats (Bottom Bar) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end pointer-events-none">
        
        {/* Health & Armor */}
        <div className="flex flex-col gap-2 w-64">
           <div className="flex items-center gap-2 text-white bg-slate-900/80 p-2 rounded-lg">
              <Heart className="text-red-500 fill-red-500" size={20} />
              <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" 
                  style={{ width: `${playerState.health}%` }} 
                />
              </div>
              <span className="font-mono font-bold text-sm">{Math.floor(playerState.health)}</span>
           </div>
        </div>

        {/* Weapon Info */}
        <div className="flex items-end gap-4">
             {/* Gun Display */}
             <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 text-right flex flex-col items-end min-w-[200px]">
                <span className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                    {currentWeapon.name}
                </span>
                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-mono font-bold ${playerState.ammo < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {playerState.ammo}
                    </span>
                    <span className="text-gray-400 text-lg font-mono">/ ∞</span>
                </div>
                {playerState.isReloading && (
                    <div className="text-yellow-400 text-xs uppercase font-bold animate-bounce mt-1">
                        Reloading...
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* 5. Controls / Settings Hint */}
      <div className="absolute top-4 right-4 pointer-events-auto">
         <button 
           onClick={() => setShowSettings(true)}
           className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition"
         >
            <Settings size={24} />
         </button>
      </div>

      {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
      
      {/* Interaction Hint (Static for prototype feel) */}
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 text-white/70 text-sm font-mono pointer-events-none">
          WASD: Move | Shift: Run | Space: Jump | R: Reload | F: Interact | Click: Shoot
      </div>
    </>
  );
};