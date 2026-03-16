import React, { useState } from 'react';
import { Project } from '../types';
import { generateScript } from '../services/geminiService';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface NewProjectScreenProps {
  apiKey: string;
  onCancel: () => void;
  onCreated: (project: Project) => void;
}

export default function NewProjectScreen({ apiKey, onCancel, onCreated }: NewProjectScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState('Curso Executivo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome do evento é obrigatório.');
      return;
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      type,
      days: 1,
      dayLabels: ['Dia 1'],
      duration: '2 min',
      tone: 'Inspiracional',
      participantCount: 100,
      context: '',
      createdAt: new Date().toISOString(),
      cast: [],
      script: null,
      targetTakeCount: 80
    };

    onCreated(newProject);
  };

  return (
    <div className="min-h-screen bg-[#0F0804] p-6 max-w-3xl mx-auto">
      <header className="flex items-center mb-8 py-6 border-b border-[#441B06]">
        <button
          onClick={onCancel}
          className="mr-4 p-2 text-[#B55204] hover:text-[#FFA300] hover:bg-[#2A1509] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-serif text-3xl text-[#FFFBEC]">Novo Projeto</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8 pb-24">
        {error && (
          <div className="text-[#FF3B3B] text-sm bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-lg p-4 flex flex-col items-start gap-3">
            <p>{error}</p>
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="bg-[#FF3B3B]/20 hover:bg-[#FF3B3B]/30 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
              Nome do Evento/Curso
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors"
              placeholder="Ex: Imersão Liderança 2026"
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
                Tipo de Evento
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors appearance-none"
              >
                <option>Curso Executivo</option>
                <option>Workshop</option>
                <option>Hackathon</option>
                <option>Conferência</option>
                <option>Outro</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] font-bold rounded-2xl px-6 py-4 min-h-[56px] flex items-center justify-center transition-colors text-lg shadow-[0_0_30px_rgba(255,163,0,0.2)] hover:shadow-[0_0_40px_rgba(255,163,0,0.4)]"
        >
          Criar Projeto
          <ArrowRight className="w-6 h-6 ml-3" />
        </button>
      </form>
    </div>
  );
}
