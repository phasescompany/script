import { useState } from 'react';
import { testApiKey } from '../services/geminiService';
import { Key, Loader2, ArrowRight } from 'lucide-react';

interface SetupScreenProps {
  onSave: (key: string) => void;
}

export default function SetupScreen({ onSave }: SetupScreenProps) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!key.trim()) {
      setError('A chave da API não pode estar vazia.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const isValid = await testApiKey(key.trim());
    
    setLoading(false);
    
    if (isValid) {
      onSave(key.trim());
    } else {
      setError('Chave inválida ou erro de conexão. Verifique e tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#1C0F06] border border-[#441B06] rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#2A1509] rounded-full flex items-center justify-center border border-[#441B06]">
            <Key className="w-8 h-8 text-[#FFA300]" />
          </div>
        </div>
        
        <h1 className="font-serif text-4xl text-center mb-2 text-[#FFFBEC]">[SCRIPT]</h1>
        <p className="text-[#FCE68F] text-center mb-8 font-mono text-sm">
          A.I. AFTERMOVIE WORKSPACE
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-[#FCE68F] mb-2 uppercase tracking-wider">
              Gemini API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#0F0804] border border-[#441B06] rounded-xl px-4 py-3 text-[#FFFBEC] focus:outline-none focus:border-[#FFA300] focus:ring-1 focus:ring-[#FFA300] transition-colors font-mono"
            />
          </div>

          {error && (
            <div className="text-[#FF3B3B] text-sm bg-[#FF3B3B]/10 border border-[#FF3B3B]/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#FFA300] hover:bg-[#FDD34C] text-[#0F0804] font-semibold rounded-xl px-4 py-3 min-h-[44px] flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Testar e Salvar
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>

        <p className="text-[#B55204] text-xs text-center mt-6">
          Obtenha sua chave gratuitamente em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-[#FFA300]">Google AI Studio</a>.
          <br />Sua chave fica salva apenas no seu navegador.
        </p>
      </div>
    </div>
  );
}
