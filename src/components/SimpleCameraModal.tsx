import React, { useRef, useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';

interface SimpleCameraModalProps {
  onClose: () => void;
  onCapture: (imageSrc: string) => void;
}

export default function SimpleCameraModal({ onClose, onCapture }: SimpleCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Make it square for avatar
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    stopCamera();
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-[#441B06] bg-[#0F0804]">
        <h3 className="font-serif text-xl text-[#FFFBEC]">Tirar Foto</h3>
        <button onClick={onClose} className="text-[#B55204] hover:text-[#FFFBEC] p-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="bg-[#FF3B3B]/10 border-b border-[#FF3B3B]/30 p-3 flex items-center justify-between">
          <p className="text-[#FF3B3B] text-xs font-mono uppercase tracking-wider">{error}</p>
          <button onClick={() => setError(null)} className="text-[#FF3B3B] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-black">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button 
            onClick={captureImage}
            className="w-16 h-16 rounded-full bg-[#FFA300] border-4 border-white flex items-center justify-center"
          >
            <Camera className="w-8 h-8 text-[#0F0804]" />
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
