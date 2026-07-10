import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Loader2, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { Scene } from '../types';

export default function StoryboardGenerator() {
  const [scriptText, setScriptText] = useState('');
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [imageSize, setImageSize] = useState('1K');
  
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScriptFile(e.target.files[0]);
    }
  };

  const extractScenes = async () => {
    if (!scriptText.trim() && !scriptFile) {
      setError('Please provide a script text or upload a file.');
      return;
    }
    setError(null);
    setIsExtracting(true);
    setScenes([]);

    try {
      const formData = new FormData();
      if (scriptFile) formData.append('scriptFile', scriptFile);
      if (scriptText) formData.append('scriptText', scriptText);

      const res = await fetch('/api/extract-scenes', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to extract scenes');
      }

      const data = await res.json();
      setScenes(data.scenes.map((s: any) => ({ ...s, isLoading: true })));
      
      // Start generating images sequentially
      generateImagesSequential(data.scenes);
    } catch (err: any) {
      setError(err.message);
      setIsExtracting(false);
    }
  };

  const generateImagesSequential = async (initialScenes: Scene[]) => {
    setIsExtracting(false);
    for (let i = 0; i < initialScenes.length; i++) {
      await generateImageForScene(i, initialScenes[i].visualPrompt);
    }
  };

  const generateImageForScene = async (index: number, prompt: string) => {
    setScenes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isLoading: true, error: undefined };
      return updated;
    });

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageSize }),
      });

      if (!res.ok) throw new Error('Image generation failed');
      const data = await res.json();

      setScenes(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], imageUrl: data.imageUrl, isLoading: false };
        return updated;
      });
    } catch (err: any) {
      setScenes(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isLoading: false, error: err.message };
        return updated;
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-300">
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-semibold tracking-tight text-white mb-2">
              Storyboard Studio
            </h1>
            <p className="text-slate-400">
              Upload your script and let AI generate a complete visual storyboard sequence.
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Paste Script</label>
              <textarea
                value={scriptText}
                onChange={e => setScriptText(e.target.value)}
                placeholder="INT. COFFEE SHOP - DAY\n\nJohn sits at the corner table, staring into his black coffee..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px] resize-y"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors border border-slate-700 text-sm font-medium whitespace-nowrap">
                  <Upload size={16} />
                  {scriptFile ? scriptFile.name : 'Upload File'}
                  <input type="file" onChange={handleFileUpload} className="hidden" accept=".txt,.pdf,.doc,.docx" />
                </label>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 whitespace-nowrap">Image Size:</span>
                  <select 
                    value={imageSize}
                    onChange={e => setImageSize(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="1K">1K</option>
                    <option value="2K">2K</option>
                    <option value="4K">4K</option>
                  </select>
                </div>
              </div>

              <button
                onClick={extractScenes}
                disabled={isExtracting || (!scriptText && !scriptFile)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isExtracting ? (
                  <><Loader2 size={18} className="animate-spin" /> Analyzing...</>
                ) : (
                  <><Play size={18} className="fill-current" /> Generate Sequence</>
                )}
              </button>
            </div>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>

          {/* Storyboard Grid */}
          {scenes.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
                <ImageIcon size={20} className="text-blue-400" /> 
                Generated Sequence
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scenes.map((scene, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex flex-col shadow-lg">
                    <div className="aspect-video bg-slate-950 relative flex items-center justify-center">
                      {scene.imageUrl ? (
                        <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
                      ) : scene.error ? (
                        <div className="text-red-400 flex flex-col items-center gap-2 p-4 text-center">
                          <AlertCircle size={24} />
                          <span className="text-sm">{scene.error}</span>
                          <button 
                            onClick={() => generateImageForScene(idx, scene.visualPrompt)}
                            className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw size={12} /> Retry
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-500 flex flex-col items-center gap-3">
                          <Loader2 size={24} className="animate-spin text-blue-500" />
                          <span className="text-sm font-medium">Generating image...</span>
                        </div>
                      )}
                      
                      {/* Scene Number Badge */}
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-md border border-white/10 shadow-sm">
                        {scene.sceneNumber}
                      </div>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col gap-3">
                      <p className="text-slate-200 font-medium text-sm leading-relaxed">
                        {scene.summary}
                      </p>
                      <div className="mt-auto pt-3 border-t border-slate-800/50">
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed" title={scene.visualPrompt}>
                          <span className="font-semibold text-slate-400 mr-1">Prompt:</span>
                          {scene.visualPrompt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
