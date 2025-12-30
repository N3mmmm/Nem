import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, Stats } from '@react-three/drei';
import { GameProvider, useGame } from './components/GameContext';
import { World } from './components/World';
import { Player } from './components/Player';
import { UI } from './components/UI';

const GameScene: React.FC = () => {
  const { settings } = useGame();
  
  return (
    <>
      <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow={settings.shadows} />
      <directionalLight 
        position={[-10, 50, 20]} 
        intensity={1.5} 
        castShadow={settings.shadows}
        shadow-mapSize={[1024, 1024]} 
      />

      <World />
      <Player />
      {process.env.NODE_ENV === 'development' && <Stats />}
    </>
  );
};

const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center z-50">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div className="relative text-center text-white space-y-8 p-12 border border-white/20 bg-black/40 rounded-3xl shadow-2xl max-w-2xl">
      <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 drop-shadow-lg">
        REACT FIRE
      </h1>
      <p className="text-xl text-gray-300 font-light">
        Battle Royale Prototype • React Three Fiber
      </p>
      
      <div className="grid grid-cols-2 gap-4 text-left bg-black/50 p-6 rounded-xl text-sm font-mono text-gray-400">
         <div>Move: <span className="text-white">WASD</span></div>
         <div>Run: <span className="text-white">Shift</span></div>
         <div>Jump: <span className="text-white">Space</span></div>
         <div>Shoot: <span className="text-white">LMB</span></div>
         <div>Interact: <span className="text-white">F</span></div>
         <div>Reload: <span className="text-white">R</span></div>
      </div>

      <button 
        onClick={onStart}
        className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-full text-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all transform hover:scale-105 active:scale-95"
      >
        DEPLOY TO BATTLEFIELD
      </button>
    </div>
  </div>
);

const GameContainer: React.FC = () => {
  const { isPlaying, setIsPlaying, settings } = useGame();

  if (!isPlaying) {
    return <StartScreen onStart={() => setIsPlaying(true)} />;
  }

  return (
    <div className="w-full h-full relative cursor-none">
      {/* Increased FOV to 80 for wider TPP awareness */}
      <Canvas shadows={settings.shadows} camera={{ fov: 80, position: [0, 2, 0] }}>
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  );
}

const App: React.FC = () => {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
};

export default App;