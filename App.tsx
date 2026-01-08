import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats, GameTurnResponse, ChatEntry, CrewMember, Quest } from './types';
import { initGame, processTurn, generatePixelArt } from './services/geminiService';

// --- CONFIGURAÇÃO INICIAL ---
const INITIAL_STATS: PlayerStats = {
  name: "",
  race: "Humano",
  class: "Pirata",
  level: 1,
  xp: 0,
  hp: 100,
  maxHp: 100,
  stamina: 50,
  maxStamina: 50,
  belly: 5000,
  bounty: 0,
  haki: { conqueror: false, armament: 0, observation: 0 },
  attributes: { strength: 5, agility: 5, intelligence: 5, charisma: 5, luck: 5 },
  location: "East Blue",
  inventory: ["Den Den Mushi (Desligado)", "Mapa Mundi", "Cantil de Água"],
  crew: [],
  quests: [],
  equipment: { weapon: "Faca de Pão" },
  isAdmin: false
};

const RACES = ["Humano", "Homem-Peixe", "Tritão", "Gigante", "Mink", "Anão", "Cyborg", "Lunarian", "Oni", "Skypiean"];
const CLASSES = ["Pirata", "Marinheiro", "Revolucionário", "Caçador de Recompensa", "Médico", "Ferreiro", "Navegador", "Cozinheiro", "Músico", "Espadachim", "Arqueólogo", "Atirador"];

type Tab = 'STATUS' | 'BAG' | 'CREW' | 'QUESTS' | 'ADMIN';

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'CREATION' | 'PLAYING'>('MENU');
  const [player, setPlayer] = useState<PlayerStats>(INITIAL_STATS);
  const [logs, setLogs] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSceneImage, setCurrentSceneImage] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  
  // UI Control
  const [activeTab, setActiveTab] = useState<Tab>('STATUS');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- LÓGICA DO JOGO ---

  const handleStartGame = async () => {
    setGameState('PLAYING');
    setIsLoading(true);
    try {
      const turnData = await initGame(player);
      handleTurnUpdate(turnData);
    } catch (e) {
      alert("Erro crítico na conexão com Grand Line.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    if (text.trim() === 'rochxz') {
       setPlayer(p => ({ ...p, isAdmin: true }));
       setLogs(prev => [...prev, { role: 'system', text: '⚠️ ACESSO ROOT CONCEDIDO. GOD MODE: ON' }]);
       setActiveTab('ADMIN');
       return;
    }

    const userMsg: ChatEntry = { role: 'user', text };
    setLogs(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const historyStrings = logs.filter(l => l.role !== 'system').map(l => l.text);
      const turnData = await processTurn(text, player, historyStrings);
      handleTurnUpdate(turnData);
    } catch (e) {
      setLogs(prev => [...prev, { role: 'system', text: 'Erro de comunicação.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTurnUpdate = (data: GameTurnResponse) => {
    setLogs(prev => [...prev, { role: 'model', text: data.narrative }]);
    if (data.statsUpdate) {
      setPlayer(prev => ({ ...prev, ...data.statsUpdate }));
    }
    setActions(data.suggestedActions || []);
    if (data.visualPrompt) {
      generatePixelArt(data.visualPrompt).then(base64 => {
        if (base64) setCurrentSceneImage(base64);
      });
    }
  };

  // --- RENDERIZADORES DE ABAS ---

  const renderStatus = () => (
    <div className="space-y-4">
      <div className="bg-black/40 p-3 rounded border border-gray-700">
        <div className="flex justify-between items-center mb-2">
            <span className="text-yellow-500 font-bold text-lg">{player.name}</span>
            <span className="text-xs bg-gray-800 px-2 py-1 rounded">{player.class}</span>
        </div>
        <div className="text-xs text-gray-400 mb-4">{player.race} • Lvl {player.level} • {player.location}</div>
        
        {/* Status Bars */}
        <div className="space-y-2 text-xs">
           <div className="flex justify-between"><span>HP</span><span>{player.hp}/{player.maxHp}</span></div>
           <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: `${(player.hp/player.maxHp)*100}%`}}></div></div>
           
           <div className="flex justify-between"><span>STA</span><span>{player.stamina}/{player.maxStamina}</span></div>
           <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-yellow-500" style={{width: `${(player.stamina/player.maxStamina)*100}%`}}></div></div>
           
           <div className="flex justify-between text-blue-300"><span>EXP</span><span>{player.xp}</span></div>
           <div className="h-1 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${(player.xp % 1000) / 10}%`}}></div></div>
        </div>
      </div>

      <div className="bg-black/40 p-3 rounded border border-gray-700">
          <h3 className="text-gray-400 text-xs mb-2 border-b border-gray-700 pb-1">ATRIBUTOS & PODER</h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex justify-between"><span>FOR:</span><span className="text-green-400">{player.attributes.strength}</span></div>
              <div className="flex justify-between"><span>AGI:</span><span className="text-green-400">{player.attributes.agility}</span></div>
              <div className="flex justify-between"><span>INT:</span><span className="text-green-400">{player.attributes.intelligence}</span></div>
              <div className="flex justify-between"><span>CAR:</span><span className="text-green-400">{player.attributes.charisma}</span></div>
          </div>
          <div className="mt-3 space-y-1">
              {player.devilFruit ? (
                  <div className="text-purple-400 text-xs border border-purple-900 bg-purple-900/20 p-1 text-center rounded">
                      🍇 {player.devilFruit}
                  </div>
              ) : <div className="text-gray-600 text-xs text-center p-1">Sem Akuma no Mi</div>}
              
              <div className="flex gap-1 justify-center mt-2">
                  <div className={`w-3 h-3 rounded-full border border-gray-600 ${player.haki.armament > 0 ? 'bg-black' : 'bg-transparent'}`} title="Haki Armamento"></div>
                  <div className={`w-3 h-3 rounded-full border border-gray-600 ${player.haki.observation > 0 ? 'bg-red-500' : 'bg-transparent'}`} title="Haki Observação"></div>
                  <div className={`w-3 h-3 rounded-full border border-gray-600 ${player.haki.conqueror ? 'bg-yellow-400 shadow-[0_0_5px_yellow]' : 'bg-transparent'}`} title="Haki do Rei"></div>
              </div>
          </div>
      </div>
      
      <div className="bg-black/40 p-3 rounded border border-gray-700 text-center">
          <div className="text-yellow-500 text-sm mb-1">฿ {player.belly.toLocaleString()}</div>
          {player.bounty > 0 && (
              <div className="mt-2 border-2 border-gray-600 bg-slate-200 p-2 text-black transform rotate-1">
                  <div className="font-serif font-black text-xl uppercase tracking-tighter">WANTED</div>
                  <div className="text-[10px] font-bold">DEAD OR ALIVE</div>
                  <div className="my-1 font-pixel text-xs">{player.name}</div>
                  <div className="font-serif font-bold text-lg">฿ {player.bounty.toLocaleString()} -</div>
              </div>
          )}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="h-full flex flex-col">
        <h3 className="text-gray-400 text-xs mb-2">MOCHILA ({player.inventory.length} ITENS)</h3>
        <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-2 content-start pr-1 custom-scrollbar">
            {player.inventory.map((item, i) => (
                <div key={i} title={item} onClick={() => handleAction(`Usar/Examinar ${item}`)} className="aspect-square bg-slate-900 border border-slate-700 hover:border-yellow-500 rounded flex flex-col items-center justify-center p-1 cursor-pointer group">
                    <div className="text-lg">📦</div>
                    <div className="text-[8px] text-center leading-tight mt-1 text-gray-500 group-hover:text-white overflow-hidden h-6">{item}</div>
                </div>
            ))}
            {/* Empty Slots Fillers */}
            {Array.from({length: Math.max(0, 20 - player.inventory.length)}).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-black/20 border border-white/5 rounded"></div>
            ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-700">
            <h3 className="text-gray-400 text-xs mb-2">EQUIPAMENTO</h3>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between bg-black/30 p-1 rounded"><span>Mão:</span> <span className="text-cyan-400">{player.equipment.weapon || "Vazio"}</span></div>
                <div className="flex justify-between bg-black/30 p-1 rounded"><span>Corpo:</span> <span className="text-gray-400">{player.equipment.armor || "Roupa Comum"}</span></div>
                <div className="flex justify-between bg-black/30 p-1 rounded"><span>Navio:</span> <span className="text-yellow-600">{player.equipment.ship || "Nenhum"}</span></div>
            </div>
        </div>
    </div>
  );

  const renderCrew = () => (
    <div className="h-full flex flex-col">
        <h3 className="text-gray-400 text-xs mb-2">TRIPULAÇÃO ({player.crew.length})</h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {player.crew.length === 0 && <div className="text-gray-600 text-center text-xs mt-10">Você navega sozinho... por enquanto.</div>}
            {player.crew.map((member, i) => (
                <div key={i} className="bg-slate-900 border border-gray-700 p-2 rounded flex gap-2 items-center">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center border border-gray-600">👤</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-white truncate">{member.name}</span>
                            <span className={`text-[8px] px-1 rounded uppercase ${member.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{member.status}</span>
                        </div>
                        <div className="text-xs text-yellow-500">{member.role}</div>
                        <div className="text-[10px] text-gray-500">Bounty: {member.bounty.toLocaleString()}</div>
                        <div className="text-[10px] text-cyan-500 truncate">{member.power}</div>
                    </div>
                </div>
            ))}
        </div>
        <button onClick={() => handleAction("Procurar novos tripulantes na taverna ou cidade")} className="mt-2 w-full py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 text-xs rounded border border-blue-700">
            + RECRUTAR
        </button>
    </div>
  );

  const renderQuests = () => (
    <div className="h-full flex flex-col">
        <h3 className="text-gray-400 text-xs mb-2">LOG POSE (MISSÕES)</h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {player.quests.length === 0 && <div className="text-gray-600 text-center text-xs mt-10">Nenhuma missão ativa. Explore o mundo!</div>}
            {player.quests.map((quest, i) => (
                <div key={i} className={`p-2 rounded border-l-2 ${quest.status === 'completed' ? 'bg-green-900/10 border-green-500 opacity-60' : 'bg-slate-900 border-yellow-500'}`}>
                    <div className="text-xs font-bold text-white mb-1">{quest.title}</div>
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-2">{quest.description}</p>
                    <div className="flex justify-between items-center text-[9px] uppercase tracking-wider">
                        <span className="text-gray-500">{quest.location}</span>
                        <span className="text-yellow-500">{quest.reward}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderAdmin = () => (
     <div className="h-full overflow-y-auto custom-scrollbar">
         <div className="text-red-500 font-pixel text-center text-xs mb-4 animate-pulse">--- GOD MODE ACTIVE ---</div>
         
         <div className="space-y-4">
             <div>
                 <h4 className="text-xs text-gray-500 mb-2 font-bold">JOGADOR</h4>
                 <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => handleAction("[ADMIN] HEAL ALL HP/STA")} className="bg-red-900/40 text-red-200 text-[10px] p-1.5 hover:bg-red-800 border border-red-800">CURA TOTAL</button>
                     <button onClick={() => handleAction("[ADMIN] ADD 1000000 BELLY")} className="bg-red-900/40 text-red-200 text-[10px] p-1.5 hover:bg-red-800 border border-red-800">+ DINHEIRO</button>
                     <button onClick={() => handleAction("[ADMIN] MAX ALL HAKI")} className="bg-red-900/40 text-red-200 text-[10px] p-1.5 hover:bg-red-800 border border-red-800">MAX HAKI</button>
                     <button onClick={() => handleAction("[ADMIN] UNLOCK CONQUEROR")} className="bg-red-900/40 text-red-200 text-[10px] p-1.5 hover:bg-red-800 border border-red-800">HAKI DO REI</button>
                 </div>
             </div>

             <div>
                 <h4 className="text-xs text-gray-500 mb-2 font-bold">ITEMS & SPAWN</h4>
                 <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => handleAction("[ADMIN] SPAWN FRUIT LOGIA")} className="bg-blue-900/40 text-blue-200 text-[10px] p-1.5 hover:bg-blue-800 border border-blue-800">SPAWN LOGIA</button>
                     <button onClick={() => handleAction("[ADMIN] SPAWN FRUIT MYTHICAL")} className="bg-blue-900/40 text-blue-200 text-[10px] p-1.5 hover:bg-blue-800 border border-blue-800">SPAWN MÍTICA</button>
                     <button onClick={() => handleAction("[ADMIN] SPAWN SWORD YORU")} className="bg-blue-900/40 text-blue-200 text-[10px] p-1.5 hover:bg-blue-800 border border-blue-800">SPAWN YORU</button>
                     <button onClick={() => handleAction("[ADMIN] SPAWN SHIP THOUSAND SUNNY")} className="bg-blue-900/40 text-blue-200 text-[10px] p-1.5 hover:bg-blue-800 border border-blue-800">NAVIO SUNNY</button>
                 </div>
             </div>

             <div>
                 <h4 className="text-xs text-gray-500 mb-2 font-bold">MUNDO & VIAGEM</h4>
                 <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => handleAction("[ADMIN] TELEPORT MARINEFORD")} className="bg-green-900/40 text-green-200 text-[10px] p-1.5 hover:bg-green-800 border border-green-800">TP MARINEFORD</button>
                     <button onClick={() => handleAction("[ADMIN] TELEPORT WANO")} className="bg-green-900/40 text-green-200 text-[10px] p-1.5 hover:bg-green-800 border border-green-800">TP WANO</button>
                     <button onClick={() => handleAction("[ADMIN] TELEPORT LAUGH TALE")} className="bg-green-900/40 text-green-200 text-[10px] p-1.5 hover:bg-green-800 border border-green-800">TP LAUGH TALE</button>
                     <button onClick={() => handleAction("[ADMIN] WEATHER STORM")} className="bg-green-900/40 text-green-200 text-[10px] p-1.5 hover:bg-green-800 border border-green-800">TEMPESTADE</button>
                 </div>
             </div>
             
             <div>
                 <h4 className="text-xs text-gray-500 mb-2 font-bold">EVENTOS</h4>
                 <div className="grid grid-cols-1 gap-2">
                     <button onClick={() => handleAction("[ADMIN] TRIGGER BUSTER CALL")} className="bg-purple-900/40 text-purple-200 text-[10px] p-1.5 hover:bg-purple-800 border border-purple-800 text-center">!!! BUSTER CALL !!!</button>
                     <button onClick={() => handleAction("[ADMIN] SPAWN YONKO KAIDO")} className="bg-purple-900/40 text-purple-200 text-[10px] p-1.5 hover:bg-purple-800 border border-purple-800 text-center">INVOCAR KAIDO</button>
                 </div>
             </div>
         </div>
     </div>
  );

  // --- RENDERIZAÇÃO PRINCIPAL ---

  if (gameState === 'MENU') {
    return (
      <div className="relative flex flex-col items-center justify-center h-full bg-black text-center p-8 bg-[url('https://images.unsplash.com/photo-1517639969476-880655d0452d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center">
        <div className="bg-black/80 p-12 rounded-lg border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.4)] backdrop-blur-sm z-10 max-w-2xl w-full">
          <h1 className="font-pixel text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-md leading-relaxed">
            ONE PIECE
          </h1>
          <h2 className="text-2xl text-white font-pixel mb-8">INFINITE ADVENTURE</h2>
          <div className="text-gray-400 font-mono text-sm mb-12 border-y border-gray-700 py-2">
             MMORPG SIMULATION • NEURAL ENGINE • PIXEL ART
          </div>
          
          <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <button 
                onClick={() => setGameState('CREATION')}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-pixel text-lg rounded border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg"
              >
                INICIAR JORNADA
              </button>
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="text-gray-600 hover:text-white text-xs mt-2 font-mono transition-colors"
              >
                ACCESS ADMIN PANEL
              </button>
          </div>
        </div>

        {showAdminLogin && (
            <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50">
                <div className="bg-gray-900 p-8 border-2 border-red-600 rounded shadow-[0_0_30px_rgba(220,38,38,0.3)] w-80">
                    <h3 className="text-red-500 font-pixel mb-6 text-center text-xs tracking-widest">RESTRICTED ACCESS</h3>
                    <input 
                        type="password" 
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        placeholder="PASSWORD"
                        className="w-full bg-black border border-red-900 text-red-500 p-3 mb-4 font-mono text-center outline-none focus:border-red-500"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                if (adminPassword === 'rochxz') {
                                    setPlayer(p => ({...p, isAdmin: true}));
                                    setActiveTab('ADMIN');
                                    setShowAdminLogin(false);
                                } else {
                                    alert("ACESSO NEGADO");
                                }
                            }} 
                            className="flex-1 bg-red-900 hover:bg-red-800 text-white p-2 font-pixel text-[10px]"
                        >
                            LOGIN
                        </button>
                        <button onClick={() => setShowAdminLogin(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white p-2 font-pixel text-[10px]">CANCEL</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  if (gameState === 'CREATION') {
    return (
      <div className="flex h-full bg-slate-900 font-mono text-green-400 overflow-hidden">
        <div className="w-1/2 p-10 overflow-y-auto border-r border-green-900 bg-black/60 custom-scrollbar">
           <h2 className="text-3xl font-pixel text-yellow-500 mb-8">NOVO PIRATA</h2>
           
           <div className="space-y-8">
              <div>
                  <label className="block text-sm text-gray-500 mb-2 tracking-widest uppercase">Identidade</label>
                  <input 
                    value={player.name} 
                    onChange={e => setPlayer({...player, name: e.target.value})}
                    className="w-full bg-slate-900/50 border border-green-800 p-4 text-xl focus:border-yellow-500 outline-none text-white rounded"
                    placeholder="Nome do Personagem"
                  />
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                    <label className="block text-sm text-gray-500 mb-2 tracking-widest uppercase">Linhagem</label>
                    <div className="space-y-2 h-64 overflow-y-auto pr-2 custom-scrollbar border border-green-900/30 p-2 rounded bg-black/20">
                        {RACES.map(r => (
                            <button 
                                key={r}
                                onClick={() => setPlayer({...player, race: r})}
                                className={`w-full text-left p-3 rounded transition-all text-sm ${player.race === r ? 'bg-green-900 text-white shadow-lg translate-x-1' : 'text-gray-500 hover:bg-white/5'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2 tracking-widest uppercase">Vocação</label>
                    <div className="space-y-2 h-64 overflow-y-auto pr-2 custom-scrollbar border border-green-900/30 p-2 rounded bg-black/20">
                        {CLASSES.map(c => (
                            <button 
                                key={c}
                                onClick={() => setPlayer({...player, class: c})}
                                className={`w-full text-left p-3 rounded transition-all text-sm ${player.class === c ? 'bg-yellow-900 text-white shadow-lg translate-x-1' : 'text-gray-500 hover:bg-white/5'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
              </div>
              
              <button 
                onClick={handleStartGame}
                disabled={!player.name}
                className="w-full py-5 mt-4 bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-lg rounded shadow-[0_0_15px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:shadow-none transition-all"
              >
                ENTRAR NA GRAND LINE
              </button>
           </div>
        </div>
        
        <div className="w-1/2 flex flex-col items-center justify-center bg-black relative overflow-hidden">
             {/* Background Effect */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
             <div className="z-10 text-center space-y-4">
                 <div className="w-64 h-64 border-4 border-yellow-600 bg-slate-800 flex items-center justify-center shadow-2xl relative">
                     <span className="text-8xl filter drop-shadow-lg">🏴‍☠️</span>
                     <div className="absolute -bottom-3 -right-3 bg-red-600 text-white px-3 py-1 text-xs font-bold transform -rotate-2">WANTED</div>
                 </div>
                 <div>
                    <h3 className="text-4xl text-white font-pixel">{player.name || "NOME..."}</h3>
                    <p className="text-yellow-500 font-mono mt-2 text-xl">{player.race} • {player.class}</p>
                 </div>
             </div>
        </div>
      </div>
    );
  }

  // --- INTERFACE DE JOGO PRINCIPAL ---
  return (
    <div className="flex h-full bg-black text-gray-200 font-mono overflow-hidden">
      
      {/* --- SIDEBAR DE GERENCIAMENTO (30%) --- */}
      <div className="w-[350px] flex-shrink-0 bg-slate-950 border-r border-gray-800 flex flex-col">
          
          {/* Avatar / Visual do Local */}
          <div className="h-48 relative bg-black border-b border-gray-800 group">
             {currentSceneImage ? (
                 <img src={`data:image/png;base64,${currentSceneImage}`} className="w-full h-full object-cover pixelated opacity-80 group-hover:opacity-100 transition-opacity" alt="Scene" />
             ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
                     <span className="animate-pulse">Gerando Mundo...</span>
                 </div>
             )}
             <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-2 pt-8">
                 <div className="text-white font-pixel text-xs text-center drop-shadow-md">{player.location}</div>
             </div>
          </div>

          {/* Navegação por Abas */}
          <div className="flex border-b border-gray-800 bg-black">
              <button onClick={() => setActiveTab('STATUS')} className={`flex-1 py-3 text-[10px] font-bold ${activeTab === 'STATUS' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-slate-900' : 'text-gray-500 hover:text-gray-300'}`}>STATUS</button>
              <button onClick={() => setActiveTab('BAG')} className={`flex-1 py-3 text-[10px] font-bold ${activeTab === 'BAG' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-slate-900' : 'text-gray-500 hover:text-gray-300'}`}>BAG</button>
              <button onClick={() => setActiveTab('CREW')} className={`flex-1 py-3 text-[10px] font-bold ${activeTab === 'CREW' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-slate-900' : 'text-gray-500 hover:text-gray-300'}`}>CREW</button>
              <button onClick={() => setActiveTab('QUESTS')} className={`flex-1 py-3 text-[10px] font-bold ${activeTab === 'QUESTS' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-slate-900' : 'text-gray-500 hover:text-gray-300'}`}>LOG</button>
              {player.isAdmin && (
                  <button onClick={() => setActiveTab('ADMIN')} className={`flex-1 py-3 text-[10px] font-bold text-red-500 ${activeTab === 'ADMIN' ? 'border-b-2 border-red-500 bg-red-900/10' : 'hover:bg-red-900/10'}`}>ADM</button>
              )}
          </div>

          {/* Conteúdo da Aba */}
          <div className="flex-1 p-3 overflow-hidden bg-slate-950">
              {activeTab === 'STATUS' && renderStatus()}
              {activeTab === 'BAG' && renderInventory()}
              {activeTab === 'CREW' && renderCrew()}
              {activeTab === 'QUESTS' && renderQuests()}
              {activeTab === 'ADMIN' && renderAdmin()}
          </div>
      </div>

      {/* --- ÁREA PRINCIPAL (CHAT & AÇÃO) --- */}
      <div className="flex-1 flex flex-col bg-slate-900 relative">
          
          {/* LOG DE AVENTURA */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              {logs.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                      <div className={`max-w-[85%] p-4 rounded shadow-lg font-mono text-[15px] leading-relaxed whitespace-pre-line border-l-4 ${
                          msg.role === 'user' 
                          ? 'bg-blue-900/40 text-blue-100 border-blue-500' 
                          : msg.role === 'system'
                          ? 'bg-red-900/60 text-red-200 border-red-500 text-center w-full font-bold'
                          : 'bg-black/60 text-gray-300 border-yellow-600'
                      }`}>
                          {msg.role === 'model' && (
                            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1">
                                <span className="text-yellow-500 font-pixel text-[10px]">GAME ENGINE</span>
                            </div>
                          )}
                          {msg.text}
                      </div>
                  </div>
              ))}
              {isLoading && (
                  <div className="flex justify-start">
                      <div className="bg-black/40 text-yellow-500 p-3 rounded border border-yellow-800/30 text-xs flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
                          Processando destino...
                      </div>
                  </div>
              )}
              <div ref={chatEndRef} />
          </div>

          {/* BARRA DE AÇÃO */}
          <div className="p-4 bg-black border-t border-gray-800 shadow-2xl z-20">
               {/* Sugestões Rápidas */}
               {actions.length > 0 && !isLoading && (
                 <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                     {actions.map((act, i) => (
                         <button 
                           key={i} 
                           onClick={() => handleAction(act)}
                           className="flex-shrink-0 bg-gray-900 hover:bg-gray-800 text-cyan-400 border border-cyan-900/50 hover:border-cyan-500 px-3 py-1.5 rounded text-xs transition-all whitespace-nowrap"
                         >
                             {act}
                         </button>
                     ))}
                 </div>
               )}
               
               <div className="flex gap-0 shadow-lg rounded overflow-hidden border border-gray-700">
                   <input 
                      className="flex-1 bg-slate-900 text-white p-4 outline-none font-mono focus:bg-slate-800 transition-colors"
                      placeholder="Descreva sua ação..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAction(input)}
                      disabled={isLoading}
                   />
                   <button 
                      onClick={() => handleAction(input)}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-black font-bold px-8 font-pixel transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       ➡️
                   </button>
               </div>
          </div>
      </div>
    </div>
  );
}
