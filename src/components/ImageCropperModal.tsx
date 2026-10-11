import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Check, X, RotateCw, Loader2, Crop } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
  isUploading = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Mouse / Touch Dragging Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const cropSize = 320; // 320x320 high-res avatar
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const cropAreaSize = Math.min(containerRect.width, containerRect.height) * 0.75;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropSize, cropSize);

    // Save state
    ctx.save();
    ctx.translate(cropSize / 2, cropSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Compute scale ratio from preview to canvas
    const scaleFactor = cropSize / cropAreaSize;
    const drawX = position.x * scaleFactor;
    const drawY = position.y * scaleFactor;
    const drawWidth = img.width * zoom * scaleFactor;
    const drawHeight = img.height * zoom * scaleFactor;

    ctx.drawImage(img, drawX - drawWidth / 2, drawY - drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Crop className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-bold">Crop Profile Photo</h3>
        </div>
        <button
          onClick={onCancel}
          disabled={isUploading}
          className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Interactive Crop Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 flex items-center justify-center overflow-hidden my-4 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Render Image with transforms */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt="To crop"
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxWidth: '85%',
            maxHeight: '85%',
          }}
          className="object-contain pointer-events-none select-none rounded-lg"
        />

        {/* Circular Avatar Mask Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 rounded-full border-2 border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] relative">
            {/* Grid Guide Crosshairs */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/20 rounded-full overflow-hidden pointer-events-none">
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-b border-white/15" />
              <div className="border-r border-white/15" />
              <div className="border-r border-white/15" />
              <div />
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 text-center text-xs text-slate-400 pointer-events-none">
          Drag to reposition • Use slider to zoom
        </div>
      </div>

      {/* Controls & Action Buttons */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-white/10 space-y-4">
        {/* Zoom & Rotate Controls */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.2))}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="0.6"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-sky-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />

          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(3, prev + 0.2))}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCrop}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                <span>Crop & Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
