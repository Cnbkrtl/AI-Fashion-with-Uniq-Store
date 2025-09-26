import React, { useState, useRef, WheelEvent, MouseEvent } from 'react';
import { Spinner } from './Spinner';
import { PhotoIcon } from './icons/PhotoIcon';
import { ResetZoomIcon } from './icons/ResetZoomIcon';

interface ImageDisplayProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
  isEnhancing?: boolean;
  onEnhanceClick?: () => void;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ title, imageUrl, isLoading = false, isEnhancing = false, onEnhanceClick }) => {
  const showLoading = isLoading || isEnhancing;

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startMousePos = useRef({ x: 0, y: 0 });
  const startImgPos = useRef({ x: 0, y: 0 });

  // Only enable zoom/pan for the generated image display, identified by the presence of `onEnhanceClick`.
  const isInteractive = !!onEnhanceClick;

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!isInteractive || !containerRef.current || isDragging) return;
    e.preventDefault();
    
    const zoomSpeed = 0.1;
    // Invert deltaY for natural scroll direction (scroll up = zoom in)
    const newScale = scale - (e.deltaY * zoomSpeed * 0.1);
    const clampedScale = Math.max(1, Math.min(newScale, 5)); // Clamp scale between 1x and 5x

    if (Math.abs(clampedScale - scale) < 0.01) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new position to keep the point under the mouse stationary
    const newPosX = mouseX - ((mouseX - position.x) / scale) * clampedScale;
    const newPosY = mouseY - ((mouseY - position.y) / scale) * clampedScale;

    setScale(clampedScale);
    
    // If zooming out to 1x, reset position completely
    if (clampedScale === 1) {
      setPosition({ x: 0, y: 0 });
    } else {
      setPosition({ x: newPosX, y: newPosY });
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Only allow dragging when zoomed in
    if (!isInteractive || scale <= 1 || showLoading) return;
    e.preventDefault();
    setIsDragging(true);
    startMousePos.current = { x: e.clientX, y: e.clientY };
    startImgPos.current = { ...position };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !isDragging) return;
    e.preventDefault();
    const dx = e.clientX - startMousePos.current.x;
    const dy = e.clientY - startMousePos.current.y;
    setPosition({
      x: startImgPos.current.x + dx,
      y: startImgPos.current.y + dy,
    });
  };

  const handleMouseUpOrLeave = (e: MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !isDragging) return;
    // Don't prevent default on mouse leave
    if (e.type === 'mouseup') e.preventDefault();
    setIsDragging(false);
  };
  
  const handleResetZoom = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent the mousedown on the container from firing
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  let cursorStyle = 'default';
  if (isInteractive && imageUrl && !showLoading) {
    if (scale > 1) {
      cursorStyle = isDragging ? 'grabbing' : 'grab';
    } else {
      cursorStyle = 'zoom-in';
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-2xl shadow-lg p-4 flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-purple-400 mb-0 text-center">{title}</h3>
      <div 
        ref={containerRef}
        className="aspect-w-3 aspect-h-4 bg-gray-900/50 rounded-lg flex-grow flex items-center justify-center overflow-hidden relative select-none"
        onWheel={isInteractive ? handleWheel : undefined}
        onMouseMove={isInteractive ? handleMouseMove : undefined}
        onMouseUp={isInteractive ? handleMouseUpOrLeave : undefined}
        onMouseLeave={isInteractive ? handleMouseUpOrLeave : undefined}
        onMouseDown={isInteractive ? handleMouseDown : undefined}
        style={{ cursor: cursorStyle }}
      >
        {showLoading && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-gray-400 z-10 p-4 text-center">
            <Spinner className="w-10 h-10" />
            <p className="mt-4 text-lg">{isEnhancing ? 'Enhancing your image...' : 'Generating your image...'}</p>
            <p className="text-sm text-gray-500">{isEnhancing ? 'Upscaling and adding photorealism.' : 'This may take a moment.'}</p>
          </div>
        )}
        
        {imageUrl && !showLoading ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="object-contain w-full h-full"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
            draggable={false}
          />
        ) : !showLoading ? (
          <div className="text-gray-600 flex flex-col items-center">
            <PhotoIcon className="w-16 h-16" />
            <p className="mt-2">{title} will appear here.</p>
          </div>
        ) : null}

        {isInteractive && scale > 1 && !showLoading && (
          <button 
            onClick={handleResetZoom} 
            className="absolute top-3 right-3 bg-gray-900/60 backdrop-blur-sm p-2 rounded-full text-white hover:bg-gray-800/80 transition-all z-20"
            aria-label="Reset Zoom"
            title="Reset Zoom"
          >
            <ResetZoomIcon className="w-5 h-5" />
          </button>
        )}
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