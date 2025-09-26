import React from 'react';
import { Spinner } from './Spinner';
import { PhotoIcon } from './icons/PhotoIcon';

interface ImageDisplayProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
  isEnhancing?: boolean;
  onEnhanceClick?: () => void;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ title, imageUrl, isLoading = false, isEnhancing = false, onEnhanceClick }) => {
  const showLoading = isLoading || isEnhancing;

  return (
    <div className="bg-gray-800/50 rounded-2xl shadow-lg p-4 flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-purple-400 mb-0 text-center">{title}</h3>
      <div className="aspect-w-3 aspect-h-4 bg-gray-900/50 rounded-lg flex-grow flex items-center justify-center overflow-hidden relative">
        {showLoading && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-gray-400 z-10 p-4 text-center">
            <Spinner className="w-10 h-10" />
            <p className="mt-4 text-lg">{isEnhancing ? 'Enhancing your image...' : 'Generating your image...'}</p>
            <p className="text-sm text-gray-500">{isEnhancing ? 'Upscaling and adding photorealism.' : 'This may take a moment.'}</p>
          </div>
        )}
        
        {imageUrl && !showLoading ? (
          <img src={imageUrl} alt={title} className="object-contain w-full h-full" />
        ) : !showLoading ? (
          <div className="text-gray-600 flex flex-col items-center">
            <PhotoIcon className="w-16 h-16" />
            <p className="mt-2">{title} will appear here.</p>
          </div>
        ) : null}
      </div>
      {imageUrl && onEnhanceClick && (
        <button
          onClick={onEnhanceClick}
          disabled={isLoading || isEnhancing}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
        >
          {isEnhancing ? (
            <>
              <Spinner /> Enhancing...
            </>
          ) : (
            'Enhance & Download'
          )}
        </button>
      )}
    </div>
  );
};
