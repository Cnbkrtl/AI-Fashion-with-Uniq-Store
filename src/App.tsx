import React, { useState, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { TextInput } from './components/TextInput';
import { Spinner } from './components/Spinner';
import { generateFashionImage, enhanceImage } from './services/geminiService';
import { Header } from './components/Header';
import { ImageDisplay } from './components/ImageDisplay';
import { ExportModal, ColorGradingSettings, ResolutionSettings } from './components/ExportModal';

const SETTINGS_STORAGE_KEY = 'aiFashionStudioSettings';

export interface ExportSettings {
  format: 'png' | 'jpeg';
  quality: number;
  colorGrading: ColorGradingSettings;
  resolution: ResolutionSettings;
}

const loadInitialSettings = (): ExportSettings => {
  const defaultSettings: ExportSettings = {
    format: 'jpeg',
    quality: 92,
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
    }
  };

  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!savedSettings) {
      return defaultSettings;
    }

    const parsed = JSON.parse(savedSettings);
    
    // Deep merge saved settings with defaults to ensure all keys exist
    const mergedSettings: ExportSettings = {
      ...defaultSettings,
      ...parsed,
      colorGrading: {
        ...defaultSettings.colorGrading,
        ...(parsed.colorGrading || {}),
      },
      resolution: {
        ...defaultSettings.resolution,
        ...(parsed.resolution || {}),
      }
    };

    // Basic validation
    if (['png', 'jpeg'].includes(mergedSettings.format) &&
        typeof mergedSettings.quality === 'number' && mergedSettings.quality >= 10 && mergedSettings.quality <= 100) {
      return mergedSettings;
    }
  } catch (error) {
    console.error("Could not load or parse saved settings, using defaults:", error);
  }
  
  return defaultSettings;
};

const getCanvasFilter = (settings: ColorGradingSettings): string => {
  const { saturation, contrast, brightness, warmth } = settings;
  let filterString = '';
  
  filterString += `saturate(${saturation}%) `;
  filterString += `contrast(${contrast}%) `;
  filterString += `brightness(${brightness}%) `;
  filterString += `sepia(${warmth}%)`;

  return filterString.trim();
};


const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [scenePrompt, setScenePrompt] = useState<string>('A woman standing confidently on a balcony overlooking the sea at sunset.');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Consolidated state for export settings, initialized from localStorage
  const [exportSettings, setExportSettings] = useState<ExportSettings>(loadInitialSettings);

  const handleImageUpload = (file: File) => {
    setSourceImage(file);
    setSourceImageUrl(URL.createObjectURL(file));
    setGeneratedImage(null); // Clear previous generation on new upload
  };

  const handleGenerate = useCallback(async () => {
    if (!sourceImage) {
      setError('Please upload a source image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateFashionImage(sourceImage, scenePrompt);
      setGeneratedImage(imageUrl);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [sourceImage, scenePrompt]);

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEnhance = useCallback(async () => {
    if (!generatedImage) {
      setError('No generated image to enhance.');
      return;
    }

    setIsEnhancing(true);
    setError(null);

    try {
      const enhancedImageUrl = await enhanceImage(generatedImage);
      setEnhancedImage(enhancedImageUrl);
      setShowExportModal(true);
    } catch (err) {
      console.error("Enhancement failed:", err);
      setError(err instanceof Error ? err.message : 'Failed to enhance image.');
    } finally {
      setIsEnhancing(false);
    }
  }, [generatedImage]);
  
  const handleFinalDownload = () => {
    if (!enhancedImage) {
      setError('No enhanced image available to download.');
      return;
    }
    
    // Save current settings to localStorage
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(exportSettings));
    } catch (error) {
      console.error("Could not save settings:", error);
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Could not process image for download.');
        setShowExportModal(false);
        return;
      }
      
      const originalWidth = img.width;
      const originalHeight = img.height;
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;
      const originalAspectRatio = originalWidth / originalHeight;
      let requiresCropping = false;

      switch (exportSettings.resolution.preset) {
        case 'hd':
          if (originalAspectRatio >= 1) { // Landscape or square
            targetWidth = 1920;
            targetHeight = 1920 / originalAspectRatio;
          } else { // Portrait
            targetHeight = 1920;
            targetWidth = 1920 * originalAspectRatio;
          }
          break;
        case '4k':
          if (originalAspectRatio >= 1) { // Landscape or square
            targetWidth = 3840;
            targetHeight = 3840 / originalAspectRatio;
          } else { // Portrait
            targetHeight = 3840;
            targetWidth = 3840 * originalAspectRatio;
          }
          break;
        case 'square':
          targetWidth = 1080;
          targetHeight = 1080;
          requiresCropping = true;
          break;
        case 'portrait':
          targetWidth = 1080;
          targetHeight = 1920;
          requiresCropping = true;
          break;
        case 'landscape':
          targetWidth = 1920;
          targetHeight = 1080;
          requiresCropping = true;
          break;
        case 'custom':
          targetWidth = exportSettings.resolution.width || originalWidth;
          targetHeight = exportSettings.resolution.height || originalHeight;
          // Check if custom dimensions' aspect ratio differs from original
          if (Math.abs((targetWidth / targetHeight) - originalAspectRatio) > 0.01) {
            requiresCropping = true;
          }
          break;
        case 'original':
        default:
          // Use original dimensions, no cropping needed
          break;
      }

      canvas.width = Math.round(targetWidth);
      canvas.height = Math.round(targetHeight);
      
      // Apply color grading filters
      ctx.filter = getCanvasFilter(exportSettings.colorGrading);

      if (requiresCropping) {
        const canvasAspectRatio = canvas.width / canvas.height;
        let sx = 0, sy = 0, sWidth = originalWidth, sHeight = originalHeight;

        if (originalAspectRatio > canvasAspectRatio) {
          // Image is wider than canvas, crop sides (center crop)
          sWidth = originalHeight * canvasAspectRatio;
          sx = (originalWidth - sWidth) / 2;
        } else if (originalAspectRatio < canvasAspectRatio) {
          // Image is taller than canvas, crop top/bottom (center crop)
          sHeight = originalWidth / canvasAspectRatio;
          sy = (originalHeight - sHeight) / 2;
        }
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      } else {
        // No cropping needed, draw image scaled to fit
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      let dataUrl: string;
      let filename: string;

      if (exportSettings.format === 'png') {
        dataUrl = canvas.toDataURL('image/png');
        filename = 'ai-fashion-photoshoot-enhanced.png';
      } else {
        const qualityValue = exportSettings.quality / 100;
        dataUrl = canvas.toDataURL('image/jpeg', qualityValue);
        filename = 'ai-fashion-photoshoot-enhanced.jpeg';
      }
      
      downloadImage(dataUrl, filename);
      setShowExportModal(false);
    };
    img.onerror = () => {
        setError('Failed to load enhanced image for conversion.');
        setShowExportModal(false);
    }
    img.src = enhancedImage;
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-4 bg-gray-800/50 rounded-2xl shadow-lg p-6 flex flex-col gap-6 h-fit">
            <h2 className="text-xl font-bold text-cyan-400 border-b border-gray-700 pb-3">1. Upload Your Model</h2>
            <ImageUploader onImageUpload={handleImageUpload} imageUrl={sourceImageUrl} />
            
            <h2 className="text-xl font-bold text-cyan-400 border-b border-gray-700 pb-3 mt-4">2. Describe the New Scene</h2>
            <TextInput
              label="Describe the entire scene..."
              value={scenePrompt}
              onChange={(e) => setScenePrompt(e.target.value)}
              placeholder="e.g., A woman standing confidently on a balcony overlooking the sea at sunset."
              rows={6}
            />
            
            <button
              onClick={handleGenerate}
              disabled={isLoading || isEnhancing || !sourceImage}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
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

          {/* Display Column */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <ImageDisplay title="Original Image" imageUrl={sourceImageUrl} />
            <ImageDisplay 
              title="AI Generated Image" 
              imageUrl={generatedImage} 
              isLoading={isLoading}
              isEnhancing={isEnhancing}
              onEnhanceClick={handleEnhance}
            />
          </div>
        </div>
      </main>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onDownload={handleFinalDownload}
        baseImageUrl={enhancedImage}
        settings={exportSettings}
        setSettings={setExportSettings}
      />
    </div>
  );
};

export default App;
