import { GoogleGenAI, Type } from "@google/genai";
import { Script, Take, Person } from "../types";

export const testApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Respond with 'OK' if you receive this.",
    });
    return response.text?.includes("OK") || false;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const generateScript = async (
  apiKey: string,
  projectData: any
): Promise<Script> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const castInfo = projectData.cast && projectData.cast.length > 0
    ? `\nPESSOAS CHAVE (CAST):\n${projectData.cast.map((p: any) => `- ${p.name} (${p.role}): ${p.type}, Importância: ${p.importance}. ${p.notes ? 'Notas: ' + p.notes : ''}`).join('\n')}\n\nINCLUA TAKES ESPECÍFICOS PARA ESTAS PESSOAS, especialmente as de importância Alta.`
    : '';

  const allowedCategoriesStr = projectData.allowedCategories && projectData.allowedCategories.length > 0
    ? `\nCATEGORIAS PERMITIDAS: ${projectData.allowedCategories.join(', ')}. Use SOMENTE estas categorias.`
    : '';

  const prompt = `
Você é um diretor de aftermovies especializado em eventos corporativos e educacionais no Brasil. Você entende profundamente a estrutura narrativa de vídeos curtos.

ESTRUTURA PADRÃO DOS AFTERMOVIES QUE VOCÊ DEVE SEGUIR:

Os aftermovies têm 4 partes narrativas:

PARTE 1 — Introdução lenta (primeiros ~15 segundos do vídeo final)
Takes de ambiente, chegada, estabelecimento de lugar e clima. Ritmo lento, shots contemplativos. Sem pessoas em destaque ainda. Geram expectativa.

PARTE 2 — Depoimentos e ação (primeiro bloco de conteúdo humano)
Takes de pessoas em ação: professor ensinando, alunos interagindo, dinâmicas em grupo. Intercalados com B-ROLL de reações, detalhes, expressões. Ritmo cresce aqui.

PARTE 3 — Bridge lento (~15 segundos de respiro narrativo)
Novamente shots de ambiente ou coffee break, detalhe de materiais, mãos escrevendo, janelas, luz. Dá respiro antes do próximo bloco emocional.

PARTE 4 — Fechamento emocional (depoimentos espontâneos + encerramento)
Takes de depoimentos, abraços, certificados, grupo completo. Os takes mais emocionais e definitivos. Encerramento forte.

B-ROLL permeia todas as partes: detalhes, texturas, reações de fundo, ambiente.

REGRAS ABSOLUTAS:
- Distribua os takes pelas 4 partes narrativas, não só pelos dias
- Todo take tem uma função narrativa clara (qual parte serve)
- Takes de ALTA prioridade são aqueles que não podem ser recuperados depois (momento único, pessoa específica, abertura/encerramento)
- Takes de MÉDIA prioridade são importantes mas têm alternativas
- Takes de BAIXA prioridade são B-ROLL de suporte
- Sempre inclua takes de B-ROLL suficientes (pelo menos 40% do total)
- VOCÊ DEVE GERAR EXATAMENTE ${projectData.targetTakeCount || 80} TAKES. NEM MAIS, NEM MENOS.
- Distribuição por dia deve ser equilibrada, priorizando takes únicos nos últimos dias (encerramento)
- O último dia SEMPRE tem os takes mais críticos (grupo completo, encerramento, depoimentos finais)
${allowedCategoriesStr}

Aqui estão os detalhes do evento:
Nome: ${projectData.name}
Tipo: ${projectData.type}
Dias de captação: ${projectData.days} (${projectData.dayLabels.join(', ')})
Duração alvo: ${projectData.duration}
Tom/Estilo: ${projectData.tone}
Participantes estimados: ${projectData.participantCount}
Contexto adicional: ${projectData.context}
${castInfo}

Retorne SOMENTE JSON válido com esta estrutura, sem markdown, sem comentários:
{
  "narrativa": "2 frases descrevendo o arco emocional do aftermovie",
  "takes": [
    {
      "numero": 1,
      "dia": 1,
      "parte_narrativa": 1,
      "categoria": "ambiente",
      "titulo": "Abertura do Espaço",
      "descricao": "Wide shot do local vazio antes dos participantes chegarem. Estabelece onde estamos.",
      "composicao": "Regra dos terços. Linha de horizonte no terço inferior. Espaço negativo no topo.",
      "movimento": "Pan lento esquerda para direita, 8 segundos",
      "duracao_seg": 8,
      "prioridade": "alta",
      "notas_tecnicas": "Captar antes das 19h para aproveitar luz natural pela janela"
    }
  ]
}

Categorias sugeridas (se não houver restrição): ambiente, chegada, broll, coffee, professor, aluno, dinamica, depoimento, encerramento, grupo, detalhe
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          narrativa: { type: Type.STRING },
          takes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.INTEGER },
                dia: { type: Type.INTEGER },
                parte_narrativa: { type: Type.INTEGER },
                categoria: { type: Type.STRING },
                titulo: { type: Type.STRING },
                descricao: { type: Type.STRING },
                composicao: { type: Type.STRING },
                movimento: { type: Type.STRING },
                duracao_seg: { type: Type.INTEGER },
                prioridade: { type: Type.STRING },
                notas_tecnicas: { type: Type.STRING }
              },
              required: ["numero", "dia", "parte_narrativa", "categoria", "titulo", "descricao", "composicao", "movimento", "duracao_seg", "prioridade", "notas_tecnicas"]
            }
          }
        },
        required: ["narrativa", "takes"]
      }
    }
  });

  let text = response.text || "{}";
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const data = JSON.parse(text);
  
  data.takes = data.takes.map((t: any) => ({
    ...t,
    id: crypto.randomUUID(),
    done: false
  }));

  return data as Script;
};

export const refineScript = async (
  apiKey: string,
  currentScript: Script,
  feedback: string
): Promise<Script> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
Você é um diretor de aftermovies especializado em eventos corporativos e educacionais no Brasil. Você entende profundamente a estrutura narrativa de vídeos curtos de até 3 minutos.

Aqui está o roteiro atual de um aftermovie:
${JSON.stringify(currentScript)}

O filmmaker pediu o seguinte ajuste:
"${feedback}"

Por favor, retorne o roteiro atualizado em JSON estrito mantendo a mesma estrutura, incluindo a "parte_narrativa" (1 a 4) para cada take.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          narrativa: { type: Type.STRING },
          takes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.INTEGER },
                dia: { type: Type.INTEGER },
                parte_narrativa: { type: Type.INTEGER },
                categoria: { type: Type.STRING },
                titulo: { type: Type.STRING },
                descricao: { type: Type.STRING },
                composicao: { type: Type.STRING },
                movimento: { type: Type.STRING },
                duracao_seg: { type: Type.INTEGER },
                prioridade: { type: Type.STRING },
                notas_tecnicas: { type: Type.STRING }
              },
              required: ["numero", "dia", "parte_narrativa", "categoria", "titulo", "descricao", "composicao", "movimento", "duracao_seg", "prioridade", "notas_tecnicas"]
            }
          }
        },
        required: ["narrativa", "takes"]
      }
    }
  });

  let text = response.text || "{}";
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const data = JSON.parse(text);
  
  data.takes = data.takes.map((t: any) => ({
    ...t,
    id: crypto.randomUUID(),
    done: false
  }));

  return data as Script;
};

export const detectFacesWithGemini = async (
  apiKey: string,
  base64Image: string
): Promise<{ ymin: number; xmin: number; ymax: number; xmax: number }[]> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
Return bounding boxes for all human faces in this image.
Format your response as a JSON array of objects, where each object has "ymin", "xmin", "ymax", and "xmax" properties representing the normalized coordinates (0 to 1000) of the bounding box.
Example: [{"ymin": 100, "xmin": 200, "ymax": 300, "xmax": 400}]
If no faces are found, return an empty array [].
Return ONLY valid JSON.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        }
      },
      { text: prompt }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ymin: { type: Type.NUMBER },
            xmin: { type: Type.NUMBER },
            ymax: { type: Type.NUMBER },
            xmax: { type: Type.NUMBER },
          },
          required: ["ymin", "xmin", "ymax", "xmax"]
        }
      }
    }
  });

  try {
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parsing Gemini face detection response:", e);
    return [];
  }
};
export const getCaptureSuggestion = async (
  apiKey: string,
  pendingTakes: Take[],
  cast: Person[],
  context: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
Você é um diretor de fotografia experiente. O filmmaker está gravando um evento agora.
Contexto do projeto: ${context}

Takes de ALTA PRIORIDADE pendentes:
${JSON.stringify(pendingTakes)}

Cast do evento:
${JSON.stringify(cast)}

Retorne 3 sugestões práticas, curtas e objetivas (estilo "direto ao ponto de filmmaker") sobre como otimizar a captação desses takes restantes ou o que priorizar neste momento.
Formate como uma lista com marcadores simples.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Continue o bom trabalho!";
};
