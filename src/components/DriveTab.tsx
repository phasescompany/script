import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { HardDrive, Folder, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DriveTabProps {
  project: Project;
  onUpdate: (p: Project) => void;
}

export default function DriveTab({ project, onUpdate }: DriveTabProps) {
  const [tokens, setTokens] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setTokens(event.data.tokens);
        fetchFolders(event.data.tokens.access_token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const response = await fetch(`/api/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      
      if (!response.ok) {
        throw new Error('Falha ao obter URL de autenticação');
      }
      
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        setError('Por favor, permita popups para este site para conectar sua conta.');
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'Erro ao conectar com Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async (accessToken: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
      
      if (!response.ok) throw new Error('Falha ao buscar pastas');
      
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar pastas do Drive');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-[#1C0F06] border border-[#441B06] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-xl text-[#FCE68F] flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-[#FFA300]" />
              Integração Google Drive
            </h2>
            <p className="text-[#B55204] text-sm mt-1">
              Conecte seu Google Drive para escanear fotos e vídeos do projeto automaticamente.
            </p>
          </div>
          
          {!tokens ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 bg-[#FFA300] text-[#0F0804] px-4 py-2 rounded-xl font-bold hover:bg-[#FDD34C] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5" />}
              Conectar Drive
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[#10B981] bg-[#10B981]/10 px-4 py-2 rounded-xl border border-[#10B981]/20">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Conectado</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-xl flex items-start gap-3 text-[#FF3B3B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {tokens && (
          <div className="space-y-4">
            <h3 className="text-[#FCE68F] font-bold border-b border-[#441B06] pb-2">Selecione a Pasta do Projeto</h3>
            
            {loading && folders.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-[#B55204]">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : folders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-[#441B06] bg-[#0F0804] hover:border-[#FFA300] hover:bg-[#2A1509] transition-all text-left group"
                  >
                    <Folder className="w-6 h-6 text-[#B55204] group-hover:text-[#FFA300]" />
                    <span className="text-[#FFFBEC] font-medium truncate">{folder.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[#B55204] text-center py-8">Nenhuma pasta encontrada no seu Drive.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
