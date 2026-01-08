export interface CrewMember {
  name: string;
  role: string; // Capitão, Espadachim, Navegador, etc.
  power: string; // Akuma no Mi ou Estilo de Luta
  bounty: number;
  status: 'active' | 'injured' | 'captured';
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: string;
  status: 'active' | 'completed' | 'failed';
  location: string;
}

export interface PlayerStats {
  name: string;
  race: string;
  class: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  belly: number;
  bounty: number;
  devilFruit?: string;
  haki: {
    conqueror: boolean;
    armament: number; // 0-100
    observation: number; // 0-100
  };
  attributes: {
    strength: number;
    agility: number;
    intelligence: number;
    charisma: number;
    luck: number;
  };
  location: string;
  inventory: string[]; // Simplificado para strings para flexibilidade da IA
  crew: CrewMember[];
  quests: Quest[];
  equipment: {
    weapon?: string;
    armor?: string;
    accessory?: string;
    ship?: string; // Novo: Navio
  };
  isAdmin: boolean;
}

export interface GameTurnResponse {
  narrative: string;
  visualPrompt: string;
  statsUpdate?: Partial<PlayerStats>;
  suggestedActions: string[];
}

export interface ChatEntry {
  role: 'user' | 'model' | 'system';
  text: string;
  image?: string;
}