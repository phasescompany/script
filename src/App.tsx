/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Project } from './types';
import SetupScreen from './components/SetupScreen';
import HomeScreen from './components/HomeScreen';
import NewProjectScreen from './components/NewProjectScreen';
import ProjectScreen from './components/ProjectScreen';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'SETUP' | 'HOME' | 'NEW_PROJECT' | 'PROJECT'>('SETUP');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('script_api_key');
    const envApiKey = process.env.GEMINI_API_KEY;
    
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setCurrentScreen('HOME');
    } else if (envApiKey) {
      setApiKey(envApiKey);
      localStorage.setItem('script_api_key', envApiKey);
      setCurrentScreen('HOME');
    }

    const storedProjects = localStorage.getItem('script_projects');
    if (storedProjects) {
      try {
        setProjects(JSON.parse(storedProjects));
      } catch (e) {
        console.error('Failed to parse projects from localStorage', e);
      }
    }
  }, []);

  const saveApiKey = (key: string) => {
    localStorage.setItem('script_api_key', key);
    setApiKey(key);
    setCurrentScreen('HOME');
  };

  const saveProjects = (newProjects: Project[]) => {
    localStorage.setItem('script_projects', JSON.stringify(newProjects));
    setProjects(newProjects);
  };

  const handleCreateProject = (project: Project) => {
    const newProjects = [project, ...projects];
    saveProjects(newProjects);
    setCurrentProjectId(project.id);
    setCurrentScreen('PROJECT');
  };

  const handleUpdateProject = (updatedProject: Project) => {
    const newProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    saveProjects(newProjects);
  };

  const handleImportProject = (project: Project) => {
    // Ensure the imported project has a unique ID to avoid conflicts
    const newProject = { ...project, id: crypto.randomUUID() };
    const newProjects = [newProject, ...projects];
    saveProjects(newProjects);
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="min-h-screen bg-[#0F0804] text-[#FFFBEC] font-sans selection:bg-[#FFA300] selection:text-[#0F0804]">
      {currentScreen === 'SETUP' && (
        <SetupScreen onSave={saveApiKey} />
      )}
      {currentScreen === 'HOME' && (
        <HomeScreen 
          projects={projects} 
          onNewProject={() => setCurrentScreen('NEW_PROJECT')} 
          onOpenProject={(id) => {
            setCurrentProjectId(id);
            setCurrentScreen('PROJECT');
          }} 
          onDelete={(id) => {
            const newProjects = projects.filter(p => p.id !== id);
            saveProjects(newProjects);
          }}
          onImportProject={handleImportProject}
        />
      )}
      {currentScreen === 'NEW_PROJECT' && (
        <NewProjectScreen 
          apiKey={apiKey!} 
          onCancel={() => setCurrentScreen('HOME')} 
          onCreated={handleCreateProject} 
        />
      )}
      {currentScreen === 'PROJECT' && currentProject && (
        <ProjectScreen 
          apiKey={apiKey!}
          project={currentProject} 
          onUpdate={handleUpdateProject}
          onDelete={(id) => {
            const newProjects = projects.filter(p => p.id !== id);
            saveProjects(newProjects);
            setCurrentProjectId(null);
            setCurrentScreen('HOME');
          }}
          onBack={() => {
            setCurrentProjectId(null);
            setCurrentScreen('HOME');
          }} 
        />
      )}
    </div>
  );
}
