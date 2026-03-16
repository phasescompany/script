import { Project } from '../types';
import { Plus, Calendar, Clock, Film, ChevronRight, Trash2, Upload, AlertCircle, Download } from 'lucide-react';
import React, { useState, useRef } from 'react';
import CustomModal from './CustomModal';

interface HomeScreenProps {
  projects: Project[];
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
  onDelete: (id: string) => void;
  onImportProject: (project: Project) => void;
}

export default function HomeScreen({ projects, onNewProject, onOpenProject, onDelete, onImportProject }: HomeScreenProps) {
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteClick = (id: string) => {
    setProjectToDelete(id);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      onDelete(projectToDelete);
      setProjectToDelete(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.name.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedProject = JSON.parse(content) as Project;
        
        // Basic validation to ensure it's a valid project format
        if (!parsedProject.name || !parsedProject.type || !parsedProject.id) {
          throw new Error('Formato de projeto inválido.');
        }

        onImportProject(parsedProject);
        setImportError(null);
      } catch (error) {
        console.error('Error parsing imported project:', error);
        setImportError('Erro ao importar o projeto. Certifique-se de que o arquivo é um JSON válido exportado pelo Phases.');
      }
      
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#0F0804] p-6 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-8 py-6 border-b border-[#441B06]">
        <h1 className="font-mono text-2xl font-bold tracking-widest text-[#FFA300]">[SCRIPT]</h1>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
          <button
            onClick={handleImportClick}
            className="bg-[#1C0F06] hover:bg-[#2A1509] border border-[#441B06] hover:border-[#FFA300] text-[#FCE68F] font-semibold rounded-xl px-4 py-3 min-h-[44px] flex items-center transition-colors"
            title="Importar Projeto"
          >
            <Upload className="w-5 h-5 mr-2" />
            Importar
          </button>
          <button
            onClick={onNewProject}
            className="bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] font-semibold rounded-xl px-6 py-3 min-h-[44px] flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Projeto
          </button>
        </div>
      </header>

      {importError && (
        <div className="mb-6 p-4 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-xl flex items-start gap-3 text-[#FF3B3B]">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{importError}</p>
        </div>
      )}

      <div className="space-y-6">
        {projects.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-[#441B06] rounded-2xl">
            <Film className="w-16 h-16 text-[#B55204] mx-auto mb-4 opacity-50" />
            <h2 className="font-serif text-3xl text-[#FCE68F] mb-2">Nenhum projeto ainda</h2>
            <p className="text-[#B55204]">Crie seu primeiro projeto para gerar um roteiro com IA.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project, index) => {
              const totalTakes = project.script?.takes.length || 0;
              const doneTakes = project.script?.takes.filter((t) => t.done).length || 0;
              const progress = totalTakes === 0 ? 0 : Math.round((doneTakes / totalTakes) * 100);

              return (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6 cursor-pointer hover:border-[#FFA300] transition-colors group relative overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#2A1509]">
                    <div
                      className="h-full bg-[#4ADE80] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-start mb-4 mt-2">
                    <h3 className="font-serif text-2xl text-[#FFFBEC] group-hover:text-[#FFA300] transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleExportClick(e, project)}
                        className="p-2 text-[#B55204] hover:text-[#FFA300] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Exportar Projeto"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(project.id); }}
                        className="p-2 text-[#B55204] hover:text-[#FF3B3B] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Apagar Projeto"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <ChevronRight className="w-6 h-6 text-[#B55204] group-hover:text-[#FFA300] transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#2A1509] border border-[#441B06] text-xs font-mono text-[#FCE68F] uppercase tracking-wider">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {project.days} Dias
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#2A1509] border border-[#441B06] text-xs font-mono text-[#FCE68F] uppercase tracking-wider">
                      <Clock className="w-3 h-3 mr-1.5" />
                      {project.duration}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#2A1509] border border-[#441B06] text-xs font-mono text-[#FCE68F] uppercase tracking-wider">
                      {project.tone}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-[#B55204] font-mono uppercase tracking-wider mb-1">Progresso</p>
                      <p className="text-xl font-serif text-[#FFFBEC]">
                        {doneTakes} <span className="text-[#B55204] text-base">/ {totalTakes} takes</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#B55204] font-mono">
                        {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomModal 
        isOpen={projectToDelete !== null}
        title="Apagar Projeto"
        message="Tem certeza que deseja apagar este projeto permanentemente?"
        confirmLabel="Apagar"
        onConfirm={confirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}
