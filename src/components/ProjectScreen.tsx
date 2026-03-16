import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, Person, Take, Script } from '../types';
import { 
  ArrowLeft, FileText, Users, Video, Sparkles, RefreshCw, Plus, Trash2, 
  CheckCircle2, Circle, Loader2, X, Download, ChevronDown, ChevronUp, 
  MapPin, Settings, Camera, Upload, Image as ImageIcon, Search, Filter,
  MoreVertical, Edit2, UserPlus, AlertCircle, Grid, Layout, HardDrive
} from 'lucide-react';
import { refineScript, getCaptureSuggestion, generateScript } from '../services/geminiService';
import CustomModal from './CustomModal';
import FaceDetectionModal from './FaceDetectionModal';
import SimpleCameraModal from './SimpleCameraModal';
import DriveTab from './DriveTab';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ProjectScreenProps {
  apiKey: string;
  project: Project;
  onUpdate: (project: Project) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function ProjectScreen({ apiKey, project, onUpdate, onDelete, onBack }: ProjectScreenProps) {
  const [activeTab, setActiveTab] = useState<'DETALHES' | 'CAST' | 'ROTEIRO' | 'CAPTAÇÃO' | 'DRIVE'>(
    project.script ? (project.script.takes.length > 0 ? 'CAPTAÇÃO' : 'ROTEIRO') : 'DETALHES'
  );
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false);

  const handleDelete = () => {
    setShowDeleteProjectConfirm(true);
  };

  const confirmDeleteProject = () => {
    onDelete(project.id);
    setShowDeleteProjectConfirm(false);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.name.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="min-h-screen bg-[#0F0804] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0F0804]/90 backdrop-blur-md border-b border-[#441B06] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 mr-2 text-[#B55204] hover:text-[#FFA300] rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-serif text-2xl text-[#FFFBEC] leading-tight">{project.name}</h1>
            <p className="text-xs font-mono text-[#FCE68F] uppercase tracking-wider">{project.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="p-2 text-[#B55204] hover:text-[#FFA300] rounded-xl transition-colors" title="Exportar Projeto">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="p-2 text-[#B55204] hover:text-[#FF3B3B] rounded-xl transition-colors" title="Apagar Projeto">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex border-b border-[#441B06] bg-[#1C0F06] sticky top-[81px] z-40 overflow-x-auto hide-scrollbar">
        <TabButton active={activeTab === 'DETALHES'} onClick={() => setActiveTab('DETALHES')} icon={<Settings className="w-4 h-4 mr-2" />} label="Detalhes" />
        <TabButton active={activeTab === 'CAST'} onClick={() => setActiveTab('CAST')} icon={<Users className="w-4 h-4 mr-2" />} label="Cast" />
        <TabButton active={activeTab === 'ROTEIRO'} onClick={() => setActiveTab('ROTEIRO')} icon={<FileText className="w-4 h-4 mr-2" />} label="Roteiro" />
        {project.script && (
          <TabButton active={activeTab === 'CAPTAÇÃO'} onClick={() => setActiveTab('CAPTAÇÃO')} icon={<Video className="w-4 h-4 mr-2" />} label="Captação" />
        )}
        <TabButton active={activeTab === 'DRIVE'} onClick={() => setActiveTab('DRIVE')} icon={<HardDrive className="w-4 h-4 mr-2" />} label="Drive" />
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
        {activeTab === 'DETALHES' && <DetalhesTab project={project} onUpdate={onUpdate} />}
        {activeTab === 'CAST' && <CastTab apiKey={apiKey} project={project} onUpdate={onUpdate} />}
        {activeTab === 'ROTEIRO' && <RoteiroTab apiKey={apiKey} project={project} onUpdate={onUpdate} />}
        {activeTab === 'CAPTAÇÃO' && project.script && <CaptacaoTab apiKey={apiKey} project={project} onUpdate={onUpdate} />}
        {activeTab === 'DRIVE' && <DriveTab project={project} onUpdate={onUpdate} />}
      </main>

      <CustomModal 
        isOpen={showDeleteProjectConfirm}
        title="Apagar Projeto"
        message="Tem certeza que deseja apagar este projeto permanentemente?"
        confirmLabel="Apagar"
        onConfirm={confirmDeleteProject}
        onCancel={() => setShowDeleteProjectConfirm(false)}
      />
    </div>
  );
}

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center py-4 text-sm font-mono uppercase tracking-wider transition-colors border-b-2 ${
        active ? 'border-[#FFA300] text-[#FFA300] bg-[#2A1509]' : 'border-transparent text-[#B55204] hover:text-[#FCE68F] hover:bg-[#2A1509]/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// --- DETALHES TAB ---
function DetalhesTab({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const updateField = (field: keyof Project, value: any) => {
    onUpdate({ ...project, [field]: value });
  };

  const handleDaysChange = (newDays: number) => {
    const newLabels = [...project.dayLabels];
    if (newDays > newLabels.length) {
      for (let i = newLabels.length; i < newDays; i++) {
        newLabels.push(`Dia ${i + 1}`);
      }
    } else {
      newLabels.splice(newDays);
    }
    onUpdate({ ...project, days: newDays, dayLabels: newLabels });
  };

  const handleLabelChange = (index: number, value: string) => {
    const newLabels = [...project.dayLabels];
    newLabels[index] = value;
    updateField('dayLabels', newLabels);
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 space-y-6">
        <h2 className="font-serif text-xl text-[#FCE68F] border-b border-[#441B06] pb-2">Configurações Base</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
              Duração Alvo
            </label>
            <select
              value={project.duration}
              onChange={(e) => updateField('duration', e.target.value)}
              className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors appearance-none"
            >
              <option>1 min</option>
              <option>1:30</option>
              <option>2 min</option>
              <option>2:30</option>
              <option>3 min</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
              Tom / Estilo
            </label>
            <select
              value={project.tone}
              onChange={(e) => updateField('tone', e.target.value)}
              className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors appearance-none"
            >
              <option>Inspiracional</option>
              <option>Dinâmico</option>
              <option>Emocional</option>
              <option>Corporativo</option>
              <option>Energético</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
              Participantes (Aprox.)
            </label>
            <input
              type="number"
              value={project.participantCount}
              onChange={(e) => updateField('participantCount', parseInt(e.target.value) || 0)}
              className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
              Total de Takes (Alvo)
            </label>
            <input
              type="number"
              value={project.targetTakeCount || 80}
              onChange={(e) => updateField('targetTakeCount', parseInt(e.target.value) || 80)}
              className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
            Dias de Captação
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={project.days}
            onChange={(e) => handleDaysChange(parseInt(e.target.value))}
            className="w-full accent-[#FFA300]"
          />
          <div className="text-center font-serif text-2xl text-[#FFFBEC] mt-2">
            {project.days} {project.days === 1 ? 'Dia' : 'Dias'}
          </div>
        </div>
        <div className="space-y-3">
          {project.dayLabels.map((label, index) => (
            <div key={index} className="flex items-center">
              <span className="w-16 text-sm font-mono text-[#B55204] uppercase">Dia {index + 1}</span>
              <input
                type="text"
                value={label}
                onChange={(e) => handleLabelChange(index, e.target.value)}
                className="flex-1 bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-2 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6">
        <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
          Contexto Adicional (Opcional)
        </label>
        <textarea
          value={project.context}
          onChange={(e) => updateField('context', e.target.value)}
          rows={4}
          className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors resize-none"
          placeholder="Ex: Focar bastante nas interações entre os alunos durante os coffee breaks. O CEO vai dar uma palestra surpresa no dia 2."
        />
      </div>
    </div>
  );
}

// --- ROTEIRO TAB ---
function RoteiroTab({ apiKey, project, onUpdate }: { apiKey: string, project: Project, onUpdate: (p: Project) => void }) {
  const [refineModalOpen, setRefineModalOpen] = useState(false);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [targetTakes, setTargetTakes] = useState(project.targetTakeCount || 80);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['ambiente', 'chegada', 'broll', 'coffee', 'professor', 'aluno', 'dinamica', 'depoimento', 'encerramento', 'grupo', 'detalhe']);

  const categories = ['ambiente', 'chegada', 'broll', 'coffee', 'professor', 'aluno', 'dinamica', 'depoimento', 'encerramento', 'grupo', 'detalhe'];

  const handleRefine = async () => {
    if (!refineFeedback.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (!project.script) return;
      const updatedScript = await refineScript(apiKey, project.script, refineFeedback);
      onUpdate({ ...project, script: updatedScript });
      setRefineModalOpen(false);
      setRefineFeedback('');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao refinar roteiro. Verifique sua chave de API e conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const newScript = await generateScript(apiKey, { 
        ...project, 
        targetTakeCount: targetTakes,
        allowedCategories: selectedCategories
      });
      onUpdate({ ...project, script: newScript, targetTakeCount: targetTakes });
      setRegenerateModalOpen(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao gerar roteiro. Verifique sua chave de API e conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-12 h-12 text-[#FFA300] animate-spin mb-4" />
        <p className="text-[#FCE68F] font-mono uppercase tracking-widest text-sm">Processando com IA...</p>
      </div>
    );
  }

  if (!project.script) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <Sparkles className="w-16 h-16 text-[#FFA300] mb-6 opacity-50" />
        <h2 className="font-serif text-3xl text-[#FFFBEC] mb-4">Pronto para a Mágica?</h2>
        <p className="text-[#FCE68F] mb-8 max-w-md mx-auto">
          A IA vai analisar os detalhes do seu evento e o cast que você cadastrou para gerar um roteiro de captação personalizado com {project.targetTakeCount || 80} takes.
        </p>
        
        {error && (
          <div className="text-[#FF3B3B] text-sm bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-lg p-4 mb-6 flex flex-col items-center gap-3 w-full max-w-md">
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={() => setRegenerateModalOpen(true)}
          className="bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] font-bold rounded-2xl px-8 py-4 flex items-center transition-colors text-lg shadow-[0_0_30px_rgba(255,163,0,0.2)] hover:shadow-[0_0_40px_rgba(255,163,0,0.4)]"
        >
          <Sparkles className="w-6 h-6 mr-3" />
          Configurar e Gerar Roteiro
        </button>
      </div>
    );
  }

  const takesByDay = project.script.takes.reduce((acc, take) => {
    if (!acc[take.dia]) acc[take.dia] = [];
    acc[take.dia].push(take);
    return acc;
  }, {} as Record<number, Take[]>);

  return (
    <div className="space-y-8 pb-24 relative">
      <div className="bg-[#1C0F06] border-2 border-[#FFA300]/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24 text-[#FFA300]" />
        </div>
        <h2 className="font-mono text-sm text-[#FFA300] uppercase tracking-widest mb-4">Arco Narrativo</h2>
        <p className="text-[#FFFBEC] text-lg leading-relaxed relative z-10">{project.script.narrativa}</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setRegenerateModalOpen(true)} className="flex items-center text-xs font-mono text-[#B55204] hover:text-[#FF3B3B] uppercase tracking-wider transition-colors">
          <RefreshCw className="w-3 h-3 mr-2" />
          Regenerar Roteiro
        </button>
      </div>

      {error && !refineModalOpen && (
        <div className="text-[#FF3B3B] text-sm bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-lg p-4 flex flex-col items-start gap-3">
          <p>{error}</p>
          <button 
            type="button" 
            onClick={handleRegenerate} 
            className="bg-[#FF3B3B]/20 hover:bg-[#FF3B3B]/30 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {Object.entries(takesByDay).map(([diaStr, takes]) => {
        const dia = parseInt(diaStr);
        const label = project.dayLabels[dia - 1] || `Dia ${dia}`;
        return (
          <div key={dia} className="space-y-4">
            <h3 className="font-serif text-2xl text-[#FCE68F] border-b border-[#441B06] pb-2 flex justify-between items-end">
              <span>Dia {dia} — <span className="text-[#B55204]">{label}</span></span>
              <span className="font-mono text-sm text-[#B55204]">{takes.length} takes</span>
            </h3>
            
            <div className="grid gap-4">
              {takes.map((take, index) => (
                <div key={take.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}>
                  <TakeCard take={take} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setRefineModalOpen(true)}
        className="fixed bottom-6 right-6 bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] rounded-full p-4 shadow-[0_4px_20px_rgba(255,163,0,0.3)] transition-transform hover:scale-105 z-40"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {refineModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-2xl text-[#FFFBEC]">Refinar Roteiro</h3>
              <button onClick={() => setRefineModalOpen(false)} className="text-[#B55204] hover:text-[#FFFBEC]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-[#FCE68F] text-sm mb-4">O que você gostaria de mudar? A IA reescreverá o roteiro mantendo a estrutura.</p>
            <textarea
              value={refineFeedback}
              onChange={(e) => setRefineFeedback(e.target.value)}
              rows={4}
              placeholder="Ex: Adicione mais takes de detalhes no Dia 1. Mude o tom para ser mais dinâmico."
              className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] mb-6 resize-none"
            />
            {error && refineModalOpen && (
              <div className="mb-6 text-[#FF3B3B] text-sm bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-lg p-4 flex flex-col items-start gap-3">
                <p>{error}</p>
                <button 
                  type="button" 
                  onClick={handleRefine} 
                  className="bg-[#FF3B3B]/20 hover:bg-[#FF3B3B]/30 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            )}
            <button
              onClick={handleRefine}
              className="w-full bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] font-bold rounded-xl px-4 py-3 flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Aplicar Refinamento
            </button>
          </div>
        </div>
      )}

      {regenerateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl text-[#FFFBEC]">Configurar Roteiro</h3>
              <button onClick={() => setRegenerateModalOpen(false)} className="text-[#B55204] hover:text-[#FFFBEC]">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-2 uppercase">Quantidade de Takes</label>
                <input 
                  type="number" 
                  value={targetTakes} 
                  onChange={(e) => setTargetTakes(parseInt(e.target.value))} 
                  className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300]"
                />
                <p className="text-[10px] text-[#B55204] mt-1 font-mono uppercase">Recomendado: 60 a 120 takes</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-3 uppercase">Categorias Permitidas</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        if (selectedCategories.includes(cat)) {
                          setSelectedCategories(selectedCategories.filter(c => c !== cat));
                        } else {
                          setSelectedCategories([...selectedCategories, cat]);
                        }
                      }}
                      className={`flex items-center px-3 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'bg-[#FFA300]/20 border-[#FFA300] text-[#FFA300]'
                          : 'bg-[#0F0804] border-[#441B06] text-[#B55204] hover:border-[#FFA300]/50'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full mr-2 ${selectedCategories.includes(cat) ? 'bg-[#FFA300]' : 'bg-[#441B06]'}`} />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-[#FF3B3B] text-sm bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-lg p-4">
                  {error}
                </div>
              )}

              <div className="pt-4 border-t border-[#441B06] flex gap-3">
                <button
                  onClick={() => setRegenerateModalOpen(false)}
                  className="flex-1 bg-[#2A1509] hover:bg-[#441B06] text-[#FFFBEC] font-bold rounded-xl px-4 py-3 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegenerate}
                  className="flex-[2] bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] font-bold rounded-xl px-4 py-3 flex items-center justify-center transition-colors"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Roteiro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TakeCard({ take }: { take: Take }) {
  const priorityColors = {
    alta: 'bg-[#FF3B3B]/20 text-[#FF3B3B] border-[#FF3B3B]/30',
    media: 'bg-[#FFA300]/20 text-[#FFA300] border-[#FFA300]/30',
    baixa: 'bg-[#4ADE80]/20 text-[#4ADE80] border-[#4ADE80]/30'
  };

  return (
    <div className="bg-[#2A1509] border border-[#441B06] rounded-xl p-4 flex flex-col sm:flex-row gap-4">
      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-[#1C0F06] border border-[#441B06] rounded-lg font-serif text-2xl text-[#FCE68F]">
        {take.numero}
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded bg-[#1C0F06] border border-[#441B06] text-[10px] font-mono text-[#FCE68F] uppercase tracking-wider">
            Parte {take.parte_narrativa}
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1C0F06] border border-[#441B06] text-[10px] font-mono text-[#FCE68F] uppercase tracking-wider">
            {take.categoria}
          </span>
          <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${priorityColors[take.prioridade]}`}>
            Prioridade {take.prioridade}
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1C0F06] border border-[#441B06] text-[10px] font-mono text-[#B55204] uppercase tracking-wider">
            {take.duracao_seg}s
          </span>
        </div>
        <h4 className="font-bold text-[#FFFBEC] text-lg mb-1">{take.titulo}</h4>
        <p className="text-[#FCE68F] text-sm mb-3">{take.descricao}</p>
        
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-[#1C0F06] p-2 rounded border border-[#441B06]">
            <span className="text-[#B55204] block mb-1">COMPOSIÇÃO</span>
            <span className="text-[#FFFBEC]">{take.composicao}</span>
          </div>
          <div className="bg-[#1C0F06] p-2 rounded border border-[#441B06]">
            <span className="text-[#B55204] block mb-1">MOVIMENTO</span>
            <span className="text-[#FFFBEC]">{take.movimento}</span>
          </div>
        </div>
        {take.notas_tecnicas && (
          <div className="mt-2 text-xs text-[#B55204] italic">
            * {take.notas_tecnicas}
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_PRESETS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Verde', value: '#10B981' }
];

function ColorPicker({ 
  selectedColor, 
  onSelect, 
  customColors = [], 
  onAddCustom 
}: { 
  selectedColor: string, 
  onSelect: (color: string) => void, 
  customColors?: string[],
  onAddCustom: (color: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DEFAULT_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => onSelect(preset.value)}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === preset.value ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: preset.value }}
            title={preset.name}
          />
        ))}
        {customColors.map(color => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <label className="w-8 h-8 rounded-full border-2 border-dashed border-[#441B06] flex items-center justify-center cursor-pointer hover:border-[#FFA300] transition-colors">
          <Plus className="w-4 h-4 text-[#B55204]" />
          <input 
            type="color" 
            className="hidden" 
            onChange={(e) => {
              const newColor = e.target.value;
              onAddCustom(newColor);
              onSelect(newColor);
            }} 
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedColor }} />
        <span className="text-xs font-mono text-[#FCE68F] uppercase">{selectedColor}</span>
      </div>
    </div>
  );
}

// --- CAST TAB ---
function CastTab({ apiKey, project, onUpdate }: { apiKey: string, project: Project, onUpdate: (p: Project) => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editCameraModalOpen, setEditCameraModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [type, setType] = useState<'Aluno Pagante' | 'Convidado' | 'Professor' | 'Organizador' | ''>('');
  const [importance, setImportance] = useState<'Alta' | 'Média' | 'Presença de Contexto' | 'Indefinida'>('Indefinida');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [teamColor, setTeamColor] = useState('#F97316');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedTagInput, setSelectedTagInput] = useState('');

  // Grid & Filter States
  const [gridCols, setGridCols] = useState<number>(2);
  const [gridSize, setGridSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [filterImportance, setFilterImportance] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleAddCustomColor = (color: string) => {
    const currentCustom = project.customColors || [];
    if (!currentCustom.includes(color) && !DEFAULT_PRESETS.some(p => p.value === color)) {
      onUpdate({ ...project, customColors: [...currentCustom, color] });
    }
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const newPerson: Person = {
      id: crypto.randomUUID(),
      name,
      role,
      type,
      importance,
      notes,
      location,
      teamColor,
      tags,
      photoCount: 0,
      videoCount: 0
    };
    onUpdate({ ...project, cast: [...project.cast, newPerson] });
    setModalOpen(false);
    setName(''); setRole(''); setType(''); setNotes(''); setLocation(''); setTeamColor('#FFA300'); setTags([]); setTagInput('');
  };

  const handleUpdatePerson = (updatedPerson: Person) => {
    onUpdate({
      ...project,
      cast: project.cast.map(p => p.id === updatedPerson.id ? updatedPerson : p)
    });
    setSelectedPerson(updatedPerson);
  };

  const handleDelete = (id: string) => {
    setPersonToDelete(id);
  };

  const confirmDeletePerson = () => {
    if (!personToDelete) return;
    onUpdate({ ...project, cast: project.cast.filter(p => p.id !== personToDelete) });
    if (selectedPerson?.id === personToDelete) setSelectedPerson(null);
    setPersonToDelete(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPerson) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      handleUpdatePerson({ ...selectedPerson, avatarUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (typeof bstr !== 'string') return;

      let data: any[] = [];
      if (file.name.endsWith('.csv')) {
        const parsed = Papa.parse(bstr, { header: true });
        data = parsed.data;
      } else if (file.name.endsWith('.xlsx')) {
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        data = XLSX.utils.sheet_to_json(ws);
      }

      const newCast = data.map((row: any) => ({
        id: crypto.randomUUID(),
        name: row.Nome || row.name || row.Name || 'Sem Nome',
        role: row.Cargo || row.Empresa || row.role || row.Role || '',
        type: row.Tipo || row.type || '',
        importance: row.Importancia || row.importance || 'Indefinida',
        notes: row.Notas || row.notes || '',
        location: row.Local || row.location || '',
        photoCount: 0,
        videoCount: 0
      }));

      onUpdate({ ...project, cast: [...project.cast, ...newCast] });
      setImportModalOpen(false);
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const totalCast = project.cast.length;
  const castWithTakes = project.cast.filter(p => (p.photoCount || 0) > 0 || (p.videoCount || 0) > 0).length;
  const castProgress = totalCast === 0 ? 0 : Math.round((castWithTakes / totalCast) * 100);
  const zeroTakesCount = totalCast - castWithTakes;
  
  const mostTakesPerson = [...project.cast].sort((a, b) => 
    ((b.photoCount || 0) + (b.videoCount || 0)) - ((a.photoCount || 0) + (a.videoCount || 0))
  )[0];
  const mostTakesCount = mostTakesPerson ? (mostTakesPerson.photoCount || 0) + (mostTakesPerson.videoCount || 0) : 0;

  const filteredCast = project.cast.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         person.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesImportance = filterImportance === 'ALL' || person.importance === filterImportance;
    const matchesType = filterType === 'ALL' || person.type === filterType;
    return matchesSearch && matchesImportance && matchesType;
  });

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }[gridCols as 1|2|3|4] || 'grid-cols-2';

  const boxPaddingClass = {
    sm: 'p-2 gap-2',
    md: 'p-4 gap-4',
    lg: 'p-6 gap-6'
  }[gridSize];

  return (
    <div className="space-y-6 pb-24">
      {/* Stats Header */}
      <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-4 mb-6">
        <div className="flex justify-between text-sm font-mono mb-2">
          <span className="text-[#FFFBEC]">{castWithTakes} de {totalCast} pessoas captadas</span>
          <span className="text-[#FFA300]">{castProgress}%</span>
        </div>
        <div className="w-full h-2 bg-[#2A1509] rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[#4ADE80] transition-all duration-300" style={{ width: `${castProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs font-mono uppercase tracking-wider">
          <span className="text-[#FF3B3B]">{zeroTakesCount} sem takes</span>
          {mostTakesCount > 0 && (
            <span className="text-[#4ADE80]">Destaque: {mostTakesPerson.name} ({mostTakesCount})</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="font-serif text-2xl text-[#FCE68F]">Participantes do evento</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCameraModalOpen(true)}
              className="bg-[#1C0F06] hover:bg-[#2A1509] border border-[#441B06] text-[#B55204] hover:text-[#FFA300] px-4 py-2 rounded-xl text-sm font-mono uppercase tracking-wider flex items-center transition-colors"
            >
              <Camera className="w-4 h-4 mr-2" />
              Foto
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="bg-[#1C0F06] hover:bg-[#2A1509] border border-[#441B06] text-[#B55204] hover:text-[#FFA300] px-4 py-2 rounded-xl text-sm font-mono uppercase tracking-wider flex items-center transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-[#2A1509] hover:bg-[#441B06] border border-[#441B06] text-[#FFA300] px-4 py-2 rounded-xl text-sm font-mono uppercase tracking-wider flex items-center transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </button>
          </div>
        </div>

        {/* Filter & Grid Controls */}
        <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-[#B55204] uppercase tracking-wider mb-1">Busca</label>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Nome ou cargo..."
                className="w-full bg-[#0F0804] border border-[#441B06] rounded-lg px-3 py-1.5 text-sm text-[#FFFBEC] focus:outline-none focus:border-[#FFA300]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#B55204] uppercase tracking-wider mb-1">Importância</label>
              <select 
                value={filterImportance}
                onChange={e => setFilterImportance(e.target.value)}
                className="w-full bg-[#0F0804] border border-[#441B06] rounded-lg px-3 py-1.5 text-sm text-[#FFFBEC] focus:outline-none focus:border-[#FFA300]"
              >
                <option value="ALL">Todas</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Presença de Contexto">Presença de Contexto</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#B55204] uppercase tracking-wider mb-1">Tipo</label>
              <select 
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full bg-[#0F0804] border border-[#441B06] rounded-lg px-3 py-1.5 text-sm text-[#FFFBEC] focus:outline-none focus:border-[#FFA300]"
              >
                <option value="ALL">Todos</option>
                <option value="Aluno Pagante">Aluno Pagante</option>
                <option value="Convidado">Convidado</option>
                <option value="Professor">Professor</option>
                <option value="Organizador">Organizador</option>
                <option value="">Sem Categoria</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#441B06]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#B55204] uppercase">Colunas:</span>
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setGridCols(num)}
                    className={`w-6 h-6 flex items-center justify-center rounded border text-[10px] font-mono transition-colors ${
                      gridCols === num ? 'bg-[#FFA300] text-[#0F0804] border-[#FFA300]' : 'bg-[#0F0804] border-[#441B06] text-[#B55204]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#B55204] uppercase">Tamanho:</span>
                {(['sm', 'md', 'lg'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`px-2 h-6 flex items-center justify-center rounded border text-[10px] font-mono uppercase transition-colors ${
                      gridSize === size ? 'bg-[#FFA300] text-[#0F0804] border-[#FFA300]' : 'bg-[#0F0804] border-[#441B06] text-[#B55204]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] font-mono text-[#B55204] uppercase flex items-center gap-4">
              {(filterImportance !== 'ALL' || filterType !== 'ALL' || searchQuery !== '') && (
                <button 
                  onClick={() => {
                    setFilterImportance('ALL');
                    setFilterType('ALL');
                    setSearchQuery('');
                  }}
                  className="text-[#FFA300] hover:underline"
                >
                  Limpar Filtros
                </button>
              )}
              <span>Mostrando {filteredCast.length} de {totalCast}</span>
            </div>
          </div>
        </div>
      </div>

      {project.cast.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#441B06] rounded-2xl">
          <Users className="w-12 h-12 text-[#B55204] mx-auto mb-4 opacity-50" />
          <p className="text-[#B55204]">Nenhuma pessoa adicionada ao cast.</p>
        </div>
      ) : filteredCast.length === 0 ? (
        <div className="text-center py-12 border border-[#441B06] rounded-2xl">
          <p className="text-[#B55204]">Nenhum participante encontrado com estes filtros.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${gridColsClass}`}>
          {filteredCast.map((person, index) => {
            const totalTakes = (person.photoCount || 0) + (person.videoCount || 0);
            const isZero = totalTakes === 0;
            const isLowForImportance = person.importance === 'Alta' && totalTakes < 2;

            const avatarSize = gridSize === 'sm' ? 'w-8 h-8 text-sm' : gridSize === 'md' ? 'w-12 h-12 text-xl' : 'w-16 h-16 text-2xl';

            return (
              <div 
                key={person.id} 
                onClick={() => setSelectedPerson(person)}
                className={`bg-[#1C0F06] border rounded-2xl flex items-start relative group animate-fade-in cursor-pointer transition-colors ${boxPaddingClass} ${
                  isZero ? 'border-[#FF3B3B]/50 hover:border-[#FF3B3B]' : 
                  isLowForImportance ? 'border-[#FFA300]/50 hover:border-[#FFA300]' : 
                  'border-[#441B06] hover:border-[#FFA300]/50'
                }`} 
                style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }}
                  className="absolute top-2 right-2 p-2 text-[#B55204] hover:text-[#FF3B3B] sm:opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Remover participante"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                
                <div className={`${avatarSize} rounded-[30%] bg-[#FFA300] text-[#0F0804] flex items-center justify-center font-serif flex-shrink-0 overflow-hidden`}>
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(person.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-[#FFFBEC] truncate ${gridSize === 'sm' ? 'text-sm' : 'text-lg'}`}>{person.name}</h4>
                  {person.role ? (
                    <p className={`text-[#FCE68F] truncate ${gridSize === 'sm' ? 'text-[10px]' : 'text-sm mb-2'}`}>{person.role}</p>
                  ) : (
                    <p className="text-[#FF3B3B] text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center">
                      <X className="w-3 h-3 mr-1" /> Falta Cargo
                    </p>
                  )}
                  
                  {gridSize !== 'sm' && (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {person.type ? (
                          <span className="px-2 py-0.5 rounded bg-[#2A1509] border border-[#441B06] text-[10px] font-mono text-[#FCE68F] uppercase tracking-wider">
                            {person.type}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[10px] font-mono text-[#FF3B3B] uppercase tracking-wider flex items-center">
                            <X className="w-2 h-2 mr-1" /> Sem Categoria
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${
                          person.importance === 'Alta' ? 'bg-[#FF3B3B]/20 text-[#FF3B3B] border-[#FF3B3B]/30' :
                          person.importance === 'Média' ? 'bg-[#FFA300]/20 text-[#FFA300] border-[#FFA300]/30' :
                          person.importance === 'Presença de Contexto' ? 'bg-[#4ADE80]/20 text-[#4ADE80] border-[#4ADE80]/30' :
                          'bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/30'
                        }`}>
                          {person.importance === 'Indefinida' ? 'Imp. Indefinida' : `Imp: ${person.importance}`}
                        </span>
                      </div>

                      {person.notes && (
                        <p className="text-[#B55204] text-xs italic line-clamp-1 mt-1 border-l-2 border-[#B55204]/30 pl-2">
                          "{person.notes}"
                        </p>
                      )}
                    </>
                  )}
                  
                  <div className={`flex gap-4 mt-2 pt-2 border-t border-[#441B06] ${gridSize === 'sm' ? 'hidden' : ''}`}>
                    <div className="flex items-center text-xs font-mono text-[#FCE68F]">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {person.photoCount || 0} fotos
                    </div>
                    <div className="flex items-center text-xs font-mono text-[#FCE68F]">
                      <Video className="w-3 h-3 mr-1" />
                      {person.videoCount || 0} vídeos
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl text-[#FFFBEC]">Nova Pessoa</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#B55204] hover:text-[#FFFBEC]">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]" />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Empresa / Cargo</label>
                <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]" />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Tipo</label>
                <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]">
                  <option value="">Selecione um tipo...</option>
                  <option>Aluno Pagante</option>
                  <option>Convidado</option>
                  <option>Professor</option>
                  <option>Organizador</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Importância</label>
                <select value={importance} onChange={e => setImportance(e.target.value as any)} className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]">
                  <option value="Indefinida">Indefinida</option>
                  <option>Alta</option>
                  <option>Média</option>
                  <option>Presença de Contexto</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Onde estará no evento</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]" placeholder="Ex: Sala principal, Coffee break" />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Cor da Equipe</label>
                <ColorPicker 
                  selectedColor={teamColor} 
                  onSelect={setTeamColor} 
                  customColors={project.customColors}
                  onAddCustom={handleAddCustomColor}
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="px-2 py-1 rounded bg-[#2A1509] border border-[#441B06] text-xs font-mono text-[#FCE68F] flex items-center">
                      {tag}
                      <button onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-2 text-[#FF3B3B] hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={tagInput} 
                  onChange={e => setTagInput(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      if (!tags.includes(tagInput.trim())) {
                        setTags([...tags, tagInput.trim()]);
                      }
                      setTagInput('');
                    }
                  }}
                  className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]" 
                  placeholder="Pressione Enter para adicionar" 
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Notas Rápidas</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]" placeholder="Ex: Focar nele sorrindo" />
              </div>
              
              <button onClick={handleAdd} className="w-full bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] font-bold rounded-xl px-4 py-3 mt-4">
                Salvar Pessoa
              </button>
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl text-[#FFFBEC]">Importar Planilha</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-[#B55204] hover:text-[#FFFBEC]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-[#FCE68F] text-sm mb-4">
              Selecione um arquivo .csv ou .xlsx. O sistema tentará ler as colunas: Nome, Cargo, Empresa, Tipo, Importancia, Notas, Local.
            </p>
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
              className="w-full text-[#FFFBEC] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#FFA300] file:text-[#0F0804] hover:file:bg-[#FDD34C] cursor-pointer"
            />
          </div>
        </div>
      )}

      {selectedPerson && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[30%] bg-[#FFA300] text-[#0F0804] flex items-center justify-center font-serif text-2xl flex-shrink-0 overflow-hidden">
                  {selectedPerson.avatarUrl ? (
                    <img src={selectedPerson.avatarUrl} alt={selectedPerson.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(selectedPerson.name)
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-[#FFFBEC]">{selectedPerson.name}</h3>
                  <div className="space-y-2 mt-2">
                    <div>
                      <label className="block text-[10px] font-mono text-[#B55204] uppercase tracking-wider">Cargo / Empresa</label>
                      <input 
                        type="text" 
                        value={selectedPerson.role} 
                        onChange={e => handleUpdatePerson({ ...selectedPerson, role: e.target.value })}
                        placeholder="Ex: CEO da Empresa X"
                        className={`w-full bg-[#0F0804] border rounded-lg px-2 py-1 text-sm text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] ${!selectedPerson.role ? 'border-[#FF3B3B]/50' : 'border-[#441B06]'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#B55204] uppercase tracking-wider">Tipo / Categoria</label>
                      <select 
                        value={selectedPerson.type} 
                        onChange={e => handleUpdatePerson({ ...selectedPerson, type: e.target.value })}
                        className={`w-full bg-[#0F0804] border rounded-lg px-2 py-1 text-sm text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] ${!selectedPerson.type ? 'border-[#FF3B3B]/50' : 'border-[#441B06]'}`}
                      >
                        <option value="">Selecione um tipo...</option>
                        <option>Aluno Pagante</option>
                        <option>Convidado</option>
                        <option>Professor</option>
                        <option>Organizador</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#B55204] uppercase tracking-wider">Importância</label>
                      <select 
                        value={selectedPerson.importance} 
                        onChange={e => handleUpdatePerson({ ...selectedPerson, importance: e.target.value })}
                        className={`w-full bg-[#0F0804] border rounded-lg px-2 py-1 text-sm text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] ${selectedPerson.importance === 'Indefinida' ? 'border-[#FF3B3B]/50' : 'border-[#441B06]'}`}
                      >
                        <option value="Indefinida">Indefinida</option>
                        <option>Alta</option>
                        <option>Média</option>
                        <option>Presença de Contexto</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setEditCameraModalOpen(true)} className="text-xs flex items-center text-[#B55204] hover:text-[#FFA300]">
                      <Camera className="w-3 h-3 mr-1" /> Câmera
                    </button>
                    <label className="text-xs flex items-center text-[#B55204] hover:text-[#FFA300] cursor-pointer">
                      <Upload className="w-3 h-3 mr-1" /> Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="text-[#B55204] hover:text-[#FFFBEC]">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0F0804] border border-[#441B06] rounded-xl p-4 text-center">
                  <div className="text-[#FCE68F] font-mono text-xs uppercase mb-2">Fotos</div>
                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={() => handleUpdatePerson({ ...selectedPerson, photoCount: Math.max(0, (selectedPerson.photoCount || 0) - 1) })}
                      className="w-8 h-8 rounded-full bg-[#2A1509] text-[#FFA300] flex items-center justify-center hover:bg-[#441B06]"
                    >-</button>
                    <span className="font-serif text-2xl text-[#FFFBEC]">{selectedPerson.photoCount || 0}</span>
                    <button 
                      onClick={() => handleUpdatePerson({ ...selectedPerson, photoCount: (selectedPerson.photoCount || 0) + 1 })}
                      className="w-8 h-8 rounded-full bg-[#2A1509] text-[#FFA300] flex items-center justify-center hover:bg-[#441B06]"
                    >+</button>
                  </div>
                </div>
                <div className="bg-[#0F0804] border border-[#441B06] rounded-xl p-4 text-center">
                  <div className="text-[#FCE68F] font-mono text-xs uppercase mb-2">Vídeos</div>
                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={() => handleUpdatePerson({ ...selectedPerson, videoCount: Math.max(0, (selectedPerson.videoCount || 0) - 1) })}
                      className="w-8 h-8 rounded-full bg-[#2A1509] text-[#FFA300] flex items-center justify-center hover:bg-[#441B06]"
                    >-</button>
                    <span className="font-serif text-2xl text-[#FFFBEC]">{selectedPerson.videoCount || 0}</span>
                    <button 
                      onClick={() => handleUpdatePerson({ ...selectedPerson, videoCount: (selectedPerson.videoCount || 0) + 1 })}
                      className="w-8 h-8 rounded-full bg-[#2A1509] text-[#FFA300] flex items-center justify-center hover:bg-[#441B06]"
                    >+</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Cor da Equipe</label>
                <ColorPicker 
                  selectedColor={selectedPerson.teamColor || '#F97316'} 
                  onSelect={(color) => handleUpdatePerson({ ...selectedPerson, teamColor: color })} 
                  customColors={project.customColors}
                  onAddCustom={handleAddCustomColor}
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(selectedPerson.tags || []).map(tag => (
                    <span key={tag} className="px-2 py-1 rounded bg-[#2A1509] border border-[#441B06] text-xs font-mono text-[#FCE68F] flex items-center">
                      {tag}
                      <button onClick={() => handleUpdatePerson({ ...selectedPerson, tags: (selectedPerson.tags || []).filter(t => t !== tag) })} className="ml-2 text-[#FF3B3B] hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={selectedTagInput} 
                  onChange={e => setSelectedTagInput(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' && selectedTagInput.trim()) {
                      e.preventDefault();
                      const currentTags = selectedPerson.tags || [];
                      if (!currentTags.includes(selectedTagInput.trim())) {
                        handleUpdatePerson({ ...selectedPerson, tags: [...currentTags, selectedTagInput.trim()] });
                      }
                      setSelectedTagInput('');
                    }
                  }}
                  className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]" 
                  placeholder="Pressione Enter para adicionar" 
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Notas Rápidas</label>
                <textarea 
                  value={selectedPerson.notes} 
                  onChange={e => handleUpdatePerson({ ...selectedPerson, notes: e.target.value })} 
                  className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC] resize-none" 
                  rows={3}
                  placeholder="Ex: Focar nele sorrindo" 
                />
              </div>

              <div className="pt-4 border-t border-[#441B06]">
                <button 
                  onClick={() => handleDelete(selectedPerson.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-[#FF3B3B] hover:bg-[#FF3B3B]/10 rounded-xl transition-colors font-mono text-xs uppercase tracking-widest"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Participante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {cameraModalOpen && (
        <FaceDetectionModal
          apiKey={apiKey}
          onClose={() => setCameraModalOpen(false)}
          onAddPerson={(newPerson) => {
            onUpdate({
              ...project,
              cast: [...project.cast, { ...newPerson, id: crypto.randomUUID() }]
            });
          }}
        />
      )}
      {editCameraModalOpen && selectedPerson && (
        <SimpleCameraModal
          onClose={() => setEditCameraModalOpen(false)}
          onCapture={(imageSrc) => {
            handleUpdatePerson({ ...selectedPerson, avatarUrl: imageSrc });
            setEditCameraModalOpen(false);
          }}
        />
      )}

      <CustomModal 
        isOpen={personToDelete !== null}
        title="Remover Participante"
        message="Tem certeza que deseja remover esta pessoa do cast?"
        confirmLabel="Remover"
        onConfirm={confirmDeletePerson}
        onCancel={() => setPersonToDelete(null)}
      />
    </div>
  );
}

// --- CAPTAÇÃO TAB ---
function CaptacaoTab({ apiKey, project, onUpdate }: { apiKey: string, project: Project, onUpdate: (p: Project) => void }) {
  const [filterDia, setFilterDia] = useState<number | 'ALL'>('ALL');
  const [filterCat, setFilterCat] = useState<string | 'ALL'>('ALL');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [expandedTakeId, setExpandedTakeId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const createdAt = new Date(project.createdAt);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - createdAt.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  const currentDay = Math.min(Math.max(diffDays + 1, 1), project.days);

  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({
    [currentDay]: true
  });

  const toggleDay = (day: number) => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));

  const toggleTake = (id: string) => {
    const newTakes = project.script.takes.map(t => t.id === id ? { ...t, done: !t.done } : t);
    onUpdate({ ...project, script: { ...project.script, takes: newTakes } });
  };

  const resetCapture = () => {
    setShowClearConfirm(true);
  };

  const confirmClearTakes = () => {
    const newTakes = project.script.takes.map(t => ({ ...t, done: false }));
    onUpdate({ ...project, script: { ...project.script, takes: newTakes } });
    setShowClearConfirm(false);
  };

  const handleSuggestion = async () => {
    const pendingHigh = project.script.takes.filter(t => !t.done && t.prioridade === 'alta');
    if (pendingHigh.length === 0) {
      setSuggestion("Não há takes de alta prioridade pendentes! Ótimo trabalho.");
      return;
    }
    setLoadingSuggestion(true);
    setSuggestionError('');
    try {
      const tip = await getCaptureSuggestion(apiKey, pendingHigh, project.cast, project.context);
      setSuggestion(tip);
    } catch (e: any) {
      console.error(e);
      setSuggestionError(e.message || "Erro ao gerar sugestão. Verifique sua chave de API e conexão.");
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const totalTakes = project.script.takes.length;
  const doneTakes = project.script.takes.filter(t => t.done).length;
  const pendingHigh = project.script.takes.filter(t => !t.done && t.prioridade === 'alta').length;
  const progress = totalTakes === 0 ? 0 : Math.round((doneTakes / totalTakes) * 100);

  const categories = Array.from(new Set(project.script.takes.map(t => t.categoria)));

  const filteredTakes = project.script.takes.filter(t => {
    if (filterDia !== 'ALL' && t.dia !== filterDia) return false;
    if (filterCat !== 'ALL' && t.categoria !== filterCat) return false;
    return true;
  });

  const takesByDay = filteredTakes.reduce((acc, take) => {
    if (!acc[take.dia]) acc[take.dia] = [];
    acc[take.dia].push(take);
    return acc;
  }, {} as Record<number, Take[]>);

  return (
    <div className="space-y-6 pb-24">
      {/* Stats Header */}
      <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-4 mb-6">
        <div className="flex justify-between text-sm font-mono mb-2">
          <span className="text-[#FFFBEC]">{doneTakes} de {totalTakes} takes</span>
          <span className="text-[#FFA300]">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-[#2A1509] rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[#4ADE80] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs font-mono text-[#B55204] uppercase tracking-wider">
          <span>{totalTakes - doneTakes} faltam</span>
          <span className="text-[#FF3B3B]">{pendingHigh} alta prioridade</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 overflow-x-auto pb-2 -mb-2 hide-scrollbar">
          <div className="flex gap-2">
            <FilterBtn active={filterDia === 'ALL'} onClick={() => setFilterDia('ALL')}>Todos os Dias</FilterBtn>
            {Array.from({ length: project.days }).map((_, i) => (
              <FilterBtn key={i} active={filterDia === i + 1} onClick={() => setFilterDia(i + 1)}>Dia {i + 1}</FilterBtn>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-x-auto pb-2 -mb-2 hide-scrollbar">
          <div className="flex gap-2">
            <FilterBtn active={filterCat === 'ALL'} onClick={() => setFilterCat('ALL')}>Todas Cat.</FilterBtn>
            {categories.map(cat => (
              <FilterBtn key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>{cat}</FilterBtn>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <button 
            onClick={handleSuggestion}
            disabled={loadingSuggestion}
            className="flex-1 bg-[#2A1509] hover:bg-[#441B06] border border-[#FFA300]/50 text-[#FFA300] rounded-xl py-3 flex items-center justify-center font-mono text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {loadingSuggestion ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Sugestão IA
          </button>
          <button 
            onClick={resetCapture}
            className="px-4 bg-[#1C0F06] border border-[#441B06] text-[#B55204] hover:text-[#FF3B3B] rounded-xl flex items-center justify-center transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {suggestionError && (
          <div className="text-[#FF3B3B] text-sm bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-lg p-4 flex flex-col items-start gap-3">
            <p>{suggestionError}</p>
            <button 
              type="button" 
              onClick={handleSuggestion} 
              className="bg-[#FF3B3B]/20 hover:bg-[#FF3B3B]/30 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>

      {/* Takes List Grouped by Day */}
      <div className="space-y-4">
        {Object.keys(takesByDay).length === 0 ? (
          <div className="text-center py-12 text-[#B55204] font-mono text-sm">
            Nenhum take encontrado para estes filtros.
          </div>
        ) : (
          Object.entries(takesByDay).map(([diaStr, takes]) => {
            const dia = parseInt(diaStr);
            const isExpanded = expandedDays[dia];
            const label = project.dayLabels[dia - 1] || `Dia ${dia}`;
            
            return (
              <div key={dia} className="bg-[#1C0F06] border border-[#441B06] rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleDay(dia)}
                  className="w-full flex items-center justify-between p-4 bg-[#2A1509] hover:bg-[#441B06] transition-colors"
                >
                  <div className="flex items-center">
                    <h3 className="font-serif text-xl text-[#FCE68F] mr-2">Dia {dia}</h3>
                    <span className="text-sm text-[#B55204] font-mono">— {label}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-mono text-[#B55204] mr-3">{takes.length} takes</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-[#FFA300]" /> : <ChevronDown className="w-5 h-5 text-[#B55204]" />}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-3 grid gap-3">
                    {takes.map((take, index) => {
                      const isTakeExpanded = expandedTakeId === take.id;
                      return (
                        <div 
                          key={take.id}
                          className={`flex flex-col p-4 rounded-2xl border transition-all select-none relative overflow-hidden animate-fade-in ${
                            take.done 
                              ? 'bg-[#0F0804] border-[#4ADE80]/50 opacity-70' 
                              : 'bg-[#1C0F06] border-[#441B06] hover:border-[#FFA300]/50'
                          }`}
                          style={{ animationDelay: `${index * 30}ms`, opacity: 0 }}
                        >
                          <div className="flex items-start">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleTake(take.id); }}
                              className="flex-shrink-0 mr-4 mt-1 focus:outline-none"
                            >
                              {take.done ? (
                                <CheckCircle2 className="w-12 h-12 text-[#4ADE80]" />
                              ) : (
                                <Circle className="w-12 h-12 text-[#441B06]" />
                              )}
                            </button>
                            <div 
                              className="flex-1 min-w-0 pr-16 cursor-pointer"
                              onClick={() => setExpandedTakeId(isTakeExpanded ? null : take.id)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-serif text-xl text-[#FCE68F]">#{take.numero}</span>
                                <span className="px-2 py-0.5 rounded bg-[#2A1509] border border-[#441B06] text-[10px] font-mono text-[#FCE68F] uppercase tracking-wider truncate">
                                  P{take.parte_narrativa} • {take.categoria}
                                </span>
                                {take.prioridade === 'alta' && !take.done && (
                                  <span className="px-2 py-0.5 rounded bg-[#FF3B3B]/20 border border-[#FF3B3B]/30 text-[10px] font-mono text-[#FF3B3B] uppercase tracking-wider">
                                    Alta
                                  </span>
                                )}
                              </div>
                              <h4 className={`font-bold text-lg truncate ${take.done ? 'text-[#B55204] line-through' : 'text-[#FFFBEC]'}`}>
                                {take.titulo}
                              </h4>
                            </div>
                            {take.done && (
                              <div className="absolute right-4 top-4 font-mono text-xs text-[#4ADE80] uppercase tracking-wider font-bold bg-[#0F0804] px-2 py-1 rounded border border-[#4ADE80]/30">
                                ✓ Captado
                              </div>
                            )}
                          </div>
                          
                          {isTakeExpanded && (
                            <div className="mt-4 pt-4 border-t border-[#441B06] pl-16">
                              <p className="text-sm text-[#FCE68F] mb-3">{take.descricao}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                                <div className="bg-[#0F0804] p-2 rounded border border-[#441B06]">
                                  <span className="text-[#B55204] block mb-1">COMPOSIÇÃO</span>
                                  <span className="text-[#FFFBEC]">{take.composicao}</span>
                                </div>
                                <div className="bg-[#0F0804] p-2 rounded border border-[#441B06]">
                                  <span className="text-[#B55204] block mb-1">MOVIMENTO</span>
                                  <span className="text-[#FFFBEC]">{take.movimento}</span>
                                </div>
                              </div>
                              {take.notas_tecnicas && (
                                <div className="text-xs text-[#FFA300] bg-[#FFA300]/10 p-2 rounded border border-[#FFA300]/20">
                                  <span className="font-bold uppercase tracking-wider block mb-1">Notas Técnicas</span>
                                  {take.notas_tecnicas}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Suggestion Modal */}
      {suggestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C0F06] border border-[#FFA300] rounded-2xl p-6 w-full max-w-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-[#FFA300]" />
            </div>
            <h3 className="font-serif text-2xl text-[#FFA300] mb-4 flex items-center">
              <Sparkles className="w-6 h-6 mr-2" />
              Dica do Diretor
            </h3>
            <p className="text-[#FFFBEC] text-lg leading-relaxed relative z-10 mb-6">
              {suggestion}
            </p>
            <button
              onClick={() => setSuggestion(null)}
              className="w-full bg-[#2A1509] hover:bg-[#441B06] border border-[#441B06] text-[#FFFBEC] font-bold rounded-xl px-4 py-3"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <CustomModal 
        isOpen={showClearConfirm}
        title="Limpar Captação"
        message="Tem certeza? Isso desmarcará todos os takes já capturados."
        confirmLabel="Limpar"
        onConfirm={confirmClearTakes}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}

const FilterBtn: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-colors border ${
        active 
          ? 'bg-[#FFA300] text-[#0F0804] border-[#FFA300]' 
          : 'bg-[#1C0F06] text-[#B55204] border-[#441B06] hover:border-[#FFA300]/50 hover:text-[#FCE68F]'
      }`}
    >
      {children}
    </button>
  );
}
