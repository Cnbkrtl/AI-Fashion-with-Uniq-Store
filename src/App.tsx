import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { TextInput } from './components/TextInput';
import { ImageDisplay } from './components/ImageDisplay';
import { ExportModal, ExportSettings } from './components/ExportModal';
import { Spinner } from './components/Spinner';
import { generateFashionImage, enhanceImage, isApiKeySet } from './services/geminiService';

const initialExportSettings: ExportSettings = {
  format: 'jpeg',
  quality: 95,
  colorGrading: {
    preset: 'none',
    saturation: 100,
    contrast: 100,
    brightness: 100,
    warmth: 0,
  },
  resolution: {
    preset: 'original',
    width: null,
    height: null,
    aspectRatioLocked: true,
  },
};

const App: React.FC = () => {
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [scenePrompt, setScenePrompt] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(initialExportSettings);

  useEffect(() => {
    // Revoke object URL on component unmount or when image changes to prevent memory leaks
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  const handleImageUpload = useCallback((file: File) => {
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    setUploadedImageFile(file);
    setUploadedImageUrl(URL.createObjectURL(file));
    setGeneratedImageUrl(null);
    setError(null);
  }, [uploadedImageUrl]);

  const handleGenerateClick = async () => {
    if (!uploadedImageFile || !scenePrompt.trim()) {
      setError('Please upload an image and provide a scene description.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setGeneratedImageUrl(null);

    try {
      const resultUrl = await generateFashionImage(uploadedImageFile, scenePrompt);
      setGeneratedImageUrl(resultUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during image generation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhanceClick = async () => {
    if (!generatedImageUrl) return;

    setError(null);
    setIsEnhancing(true);

    try {
      const resultUrl = await enhanceImage(generatedImageUrl);
      setEnhancedImageUrl(resultUrl);
      setExportSettings(initialExportSettings); // Reset settings on new enhancement
      setIsExportModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during image enhancement.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDownload = () => {
    if (!enhancedImageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let targetWidth = img.width;
      let targetHeight = img.height;
      const sourceAspectRatio = img.width / img.height;
      
      const { preset, width, height } = exportSettings.resolution;

      if (preset === 'custom') {
        if (width) {
          targetWidth = width;
          targetHeight = exportSettings.resolution.aspectRatioLocked ? width / sourceAspectRatio : (height || targetHeight);
        } else if (height) {
          targetHeight = height;
          targetWidth = exportSettings.resolution.aspectRatioLocked ? height * sourceAspectRatio : (width || targetWidth);
        }
      } else if (preset === 'hd') {
        targetWidth = (sourceAspectRatio >= 1) ? 1920 : 1920 * sourceAspectRatio;
        targetHeight = (sourceAspectRatio >= 1) ? 1920 / sourceAspectRatio : 1920;
      } else if (preset === '4k') {
        targetWidth = (sourceAspectRatio >= 1) ? 3840 : 3840 * sourceAspectRatio;
        targetHeight = (sourceAspectRatio >= 1) ? 3840 / sourceAspectRatio : 3840;
      }

      canvas.width = Math.round(targetWidth);
      canvas.height = Math.round(targetHeight);

      const { saturation, contrast, brightness, warmth } = exportSettings.colorGrading;
      ctx.filter = `saturate(${saturation}%) contrast(${contrast}%) brightness(${brightness}%) sepia(${warmth}%)`;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const link = document.createElement('a');
      link.download = `ai-fashion-studio.${exportSettings.format}`;
      link.href = canvas.toDataURL(`image/${exportSettings.format}`, exportSettings.format === 'jpeg' ? exportSettings.quality / 100 : undefined);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExportModalOpen(false);
    };
    img.src = enhancedImageUrl;
  };

  if (!isApiKeySet) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Configuration Error</h2>
          <p className="text-red-200">
            The Gemini API key is not configured. Please set the <code>API_KEY</code> environment variable to use this application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="lg:col-span-1 flex flex-col gap-6">
            <ImageUploader onImageUpload={handleImageUpload} imageUrl={uploadedImageUrl} />
            <TextInput 
              label="Scene Description"
              value={scenePrompt}
              onChange={(e) => setScenePrompt(e.target.value)}
              placeholder="e.g., A model walking down a runway in Paris, evening, city lights in the background, haute couture."
              rows={6}
            />
            <button
              onClick={handleGenerateClick}
              disabled={isLoading || !uploadedImageFile || !scenePrompt.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner /> Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </button>
            {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
          </div>

          <div className="lg:col-span-2">
            <ImageDisplay
              title="Generated Image"
              imageUrl={generatedImageUrl}
              isLoading={isLoading}
              isEnhancing={isEnhancing}
              onEnhanceClick={handleEnhanceClick}
            />
          </div>
        </div>
      </main>
      
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onDownload={handleDownload}
        baseImageUrl={enhancedImageUrl}
        settings={exportSettings}
        setSettings={setExportSettings}
      />
    </div>
  );
};

export default App;
