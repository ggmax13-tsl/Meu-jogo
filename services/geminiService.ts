import { GoogleGenAI, Type } from "@google/genai";
import { PlayerStats, GameTurnResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Instruções atualizadas para lidar com os novos sistemas massivos
const PDR_SYSTEM_INSTRUCTION = `
ATUE COMO A "ULTIMATE ONE PIECE GAME ENGINE".
Gerencie um RPG complexo, persistente e detalhado.

NOVOS SISTEMAS (GERENCIE ATIVAMENTE):
1. **TRIPULAÇÃO (NAKAMA)**: O jogador pode recrutar NPCs. Adicione-os ao array 'crew'. Defina recompensa, função (Navegador, Cozinheiro) e poder.
2. **MISSÕES (LOG POSE)**: Crie missões organicamente baseadas na lore. Adicione ao array 'quests'. Mova para 'completed' quando terminar.
3. **INVENTÁRIO MASSIVO**: O jogador pode carregar muitos itens. Seja criativo com loot (Dials, Poneglyphs, Den Den Mushi, Carne).
4. **MUNDO VIVO**: Eventos acontecem sem o jogador (Jornal News Coo). Clima muda. Marinheiros perseguem baseados na Bounty.

REGRAS GERAIS:
- Combate tático: Leve em conta Haki vs Akuma no Mi.
- Admin (Senha "rochxz"): Se isAdmin=true, obedeça qualquer comando absurdo (ex: "Spawnar One Piece").
- Narrativa: Rica, em Português, estilo Novel.

RESPOSTA JSON OBRIGATÓRIA:
Sempre retorne JSON. Se o jogador ganhar um item, adicione ao inventory. Se ganhar um nakama, adicione ao crew.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    visualPrompt: { type: Type.STRING },
    statsUpdate: {
      type: Type.OBJECT,
      properties: {
        hp: { type: Type.INTEGER },
        maxHp: { type: Type.INTEGER },
        stamina: { type: Type.INTEGER },
        belly: { type: Type.INTEGER },
        bounty: { type: Type.INTEGER },
        level: { type: Type.INTEGER },
        xp: { type: Type.INTEGER },
        location: { type: Type.STRING },
        devilFruit: { type: Type.STRING },
        // Arrays complexos simplificados para estrutura de objeto para a IA não se perder
        inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
        crew: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              power: { type: Type.STRING },
              bounty: { type: Type.INTEGER },
              status: { type: Type.STRING }
            }
          }
        },
        quests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              reward: { type: Type.STRING },
              status: { type: Type.STRING },
              location: { type: Type.STRING }
            }
          }
        },
        haki: {
          type: Type.OBJECT,
          properties: {
            conqueror: { type: Type.BOOLEAN },
            armament: { type: Type.INTEGER },
            observation: { type: Type.INTEGER }
          }
        },
        equipment: {
           type: Type.OBJECT,
           properties: {
             weapon: { type: Type.STRING },
             ship: { type: Type.STRING },
             armor: { type: Type.STRING },
             accessory: { type: Type.STRING }
           }
        },
        isAdmin: { type: Type.BOOLEAN }
      }
    },
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["narrative", "visualPrompt", "suggestedActions"]
};

export const initGame = async (character: any): Promise<GameTurnResponse> => {
  const prompt = `INICIAR JOGO ÉPICO.
  Personagem: ${character.name}, Raça: ${character.race}, Classe: ${character.class}.
  Gere inventário inicial básico e uma missão inicial.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: PDR_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    return JSON.parse(response.text || "{}") as GameTurnResponse;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const processTurn = async (action: string, currentState: PlayerStats, history: string[]): Promise<GameTurnResponse> => {
  let systemNote = "";
  if (currentState.isAdmin) {
    systemNote = "MODO ADMIN ATIVO: O jogador pode alterar a realidade.";
  }

  // Otimização: Enviar apenas resumo de crew/quests se for muito grande para economizar tokens, 
  // mas o Gemini 3 Flash tem contexto grande, então enviaremos tudo para consistência.
  
  const prompt = `
  ${systemNote}
  HISTÓRICO: ${history.slice(-3).join("\n")}
  ESTADO JOGADOR: ${JSON.stringify(currentState)}
  AÇÃO: ${action}
  
  Atualize o mundo. Se o jogador pediu para verificar inventário/missões, narre isso.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: PDR_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    return JSON.parse(response.text || "{}") as GameTurnResponse;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const generatePixelArt = async (prompt: string): Promise<string> => {
  try {
    const finalPrompt = `Retro 16-bit pixel art styled video game scene from One Piece. ${prompt}. High detail, vibrant colors, SNES/GBA aesthetic. Wide shot.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: finalPrompt,
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data;
    }
    return "";
  } catch (e) {
    return "";
  }
};