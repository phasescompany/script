export interface Person {
  id: string;
  name: string;
  role: string;
  type: 'Aluno Pagante' | 'Convidado' | 'Professor' | 'Organizador' | string;
  importance: 'Alta' | 'Média' | 'Presença de Contexto' | 'Indefinida' | string;
  notes: string;
  location?: string;
  photoCount?: number;
  videoCount?: number;
  avatarUrl?: string;
  teamColor?: string;
  tags?: string[];
}

export interface Take {
  id: string;
  numero: number;
  dia: number;
  parte_narrativa: number;
  categoria: string;
  titulo: string;
  descricao: string;
  composicao: string;
  movimento: string;
  duracao_seg: number;
  prioridade: 'alta' | 'media' | 'baixa';
  notas_tecnicas: string;
  done: boolean;
}

export interface Script {
  narrativa: string;
  takes: Take[];
}

export interface Project {
  id: string;
  name: string;
  type: string;
  days: number;
  dayLabels: string[];
  duration: string;
  tone: string;
  participantCount: number;
  context: string;
  createdAt: string;
  cast: Person[];
  script: Script | null;
  targetTakeCount?: number;
  customColors?: string[];
}
