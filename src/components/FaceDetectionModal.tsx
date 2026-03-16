import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, Check, Loader2 } from 'lucide-react';
import { Person } from '../types';
import { detectFacesWithGemini } from '../services/geminiService';

interface FaceDetectionModalProps {
  apiKey: string;
  onClose: () => void;
  onAddPerson: (person: Omit<Person, 'id'>) => void;
}

interface DetectedFace {
  id: string;
  box: { x: number; y: number; width: number; height: number };
  imageUrl: string;
  name?: string;
}

export default function FaceDetectionModal({ apiKey, onClose, onAddPerson }: FaceDetectionModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFace, setSelectedFace] = useState<DetectedFace | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
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

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    setImageSrc(dataUrl);
    stopCamera();
    
    detectFaces(dataUrl, canvas.width, canvas.height);
  };

  const detectFaces = async (dataUrl: string, imgWidth: number, imgHeight: number) => {
    setLoading(true);
    try {
      // Try native FaceDetector first if available
      if ('FaceDetector' in window) {
        try {
          // @ts-ignore
          const faceDetector = new window.FaceDetector();
          const img = new Image();
          img.src = dataUrl;
          await new Promise(resolve => { img.onload = resolve; });
          
          const detectedFaces = await faceDetector.detect(img);
          
          if (detectedFaces.length > 0) {
            processDetectedFaces(detectedFaces.map((f: any) => f.boundingBox), dataUrl, imgWidth, imgHeight);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Native FaceDetector failed, falling back to Gemini", e);
        }
      }
      
      // Fallback to Gemini Vision
      const base64Data = dataUrl.split(',')[1];
      const boxes = await detectFacesWithGemini(apiKey, base64Data);
      
      // Convert normalized coordinates (0-1000) to pixel coordinates
      const pixelBoxes = boxes.map(box => ({
        x: (box.xmin / 1000) * imgWidth,
        y: (box.ymin / 1000) * imgHeight,
        width: ((box.xmax - box.xmin) / 1000) * imgWidth,
        height: ((box.ymax - box.ymin) / 1000) * imgHeight
      }));
      
      processDetectedFaces(pixelBoxes, dataUrl, imgWidth, imgHeight);
      
    } catch (err) {
      console.error("Erro na detecção de rostos:", err);
      setError("Erro ao detectar rostos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const processDetectedFaces = (boxes: any[], sourceDataUrl: string, imgWidth: number, imgHeight: number) => {
    const img = new Image();
    img.onload = () => {
      const newFaces = boxes.map((box, index) => {
        // Create a cropped image for each face
        const faceCanvas = document.createElement('canvas');
        // Add some padding around the face
        const padding = Math.max(box.width, box.height) * 0.2;
        const cropX = Math.max(0, box.x - padding);
        const cropY = Math.max(0, box.y - padding);
        const cropW = Math.min(imgWidth - cropX, box.width + padding * 2);
        const cropH = Math.min(imgHeight - cropY, box.height + padding * 2);
        
        // Make it square
        const size = Math.max(cropW, cropH);
        
        // Adjust crop coordinates to center the square
        const finalCropX = Math.max(0, cropX - (size - cropW) / 2);
        const finalCropY = Math.max(0, cropY - (size - cropH) / 2);
        const finalCropW = Math.min(imgWidth - finalCropX, size);
        const finalCropH = Math.min(imgHeight - finalCropY, size);

        faceCanvas.width = size;
        faceCanvas.height = size;
        
        const ctx = faceCanvas.getContext('2d');
        if (ctx) {
          // Fill with black background in case of out of bounds
          ctx.fillStyle = '#0F0804';
          ctx.fillRect(0, 0, size, size);
          
          // Draw centered
          const dx = (size - finalCropW) / 2;
          const dy = (size - finalCropH) / 2;
          ctx.drawImage(img, finalCropX, finalCropY, finalCropW, finalCropH, dx, dy, finalCropW, finalCropH);
        }
        
        return {
          id: crypto.randomUUID(),
          box,
          imageUrl: faceCanvas.toDataURL('image/jpeg', 0.8)
        };
      });
      
      setFaces(newFaces);
    };
    img.src = sourceDataUrl;
  };

  const handleFaceClick = (face: DetectedFace) => {
    setSelectedFace(face);
    setNameInput(face.name || '');
  };

  const handleSaveName = () => {
    if (!selectedFace || !nameInput.trim()) return;
    
    setFaces(faces.map(f => 
      f.id === selectedFace.id ? { ...f, name: nameInput.trim() } : f
    ));
    
    // Create person
    onAddPerson({
      name: nameInput.trim(),
      role: '',
      type: '',
      importance: 'Indefinida',
      notes: '',
      location: '',
      photoCount: 0,
      videoCount: 0,
      avatarUrl: selectedFace.imageUrl
    });
    
    setSelectedFace(null);
    setNameInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-[#441B06] bg-[#0F0804]">
        <h3 className="font-serif text-xl text-[#FFFBEC]">Captura de Cast</h3>
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
        {!imageSrc ? (
          <>
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
          </>
        ) : (
          <div className="relative max-w-full max-h-full">
            <img src={imageSrc} alt="Captured" className="max-w-full max-h-full object-contain" />
            
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#FFA300] animate-spin mb-4" />
                <p className="text-[#FCE68F] font-mono text-sm uppercase tracking-wider">Detectando rostos...</p>
              </div>
            )}
            
            {!loading && faces.map(face => (
              <div 
                key={face.id}
                onClick={() => handleFaceClick(face)}
                className={`absolute border-2 cursor-pointer transition-colors ${
                  face.name ? 'border-[#4ADE80] bg-[#4ADE80]/20' : 'border-[#FFA300] bg-[#FFA300]/20 hover:bg-[#FFA300]/40'
                }`}
                style={{
                  left: `${(face.box.x / (canvasRef.current?.width || 1)) * 100}%`,
                  top: `${(face.box.y / (canvasRef.current?.height || 1)) * 100}%`,
                  width: `${(face.box.width / (canvasRef.current?.width || 1)) * 100}%`,
                  height: `${(face.box.height / (canvasRef.current?.height || 1)) * 100}%`,
                }}
              >
                {face.name && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#4ADE80] text-[#0F0804] text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap">
                    {face.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      {selectedFace && (
        <div className="absolute bottom-0 left-0 right-0 bg-[#1C0F06] border-t border-[#441B06] p-4 animate-slide-up">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <img src={selectedFace.imageUrl} alt="Face" className="w-16 h-16 rounded-[30%] object-cover border border-[#441B06]" />
            <div className="flex-1">
              <label className="block text-xs font-mono text-[#FCE68F] mb-1 uppercase">Nome da Pessoa</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Digite o nome..."
                  className="flex-1 bg-[#0F0804] border border-[#441B06] rounded-xl px-3 py-2 text-[#FFFBEC]"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
                <button 
                  onClick={handleSaveName}
                  disabled={!nameInput.trim()}
                  className="bg-[#4ADE80] text-[#0F0804] px-4 rounded-xl disabled:opacity-50 flex items-center justify-center"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
