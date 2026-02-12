import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  selectedImage: File | null;
  imagePreview: string | null;
  isUploading: boolean;
  disabled?: boolean;
  className?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelect,
  onImageRemove,
  selectedImage,
  imagePreview,
  isUploading,
  disabled = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      
      onImageSelect(file);
    }
  };

  const handleRemoveImage = () => {
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`image-uploader ${className}`}>
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-4 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-indigo-300 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Selected Image:
            </span>
            <Button
              onClick={handleRemoveImage}
              size="sm"
              className="h-6 w-6 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-w-xs max-h-48 rounded-lg object-cover shadow-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2 text-white">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <Tooltip content={selectedImage ? "Change Image" : "Upload Image"}>
        <Button
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
          size="sm"
          className="h-8 w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: selectedImage 
              ? `linear-gradient(135deg, #10b981, #059669)`
              : `rgba(255, 255, 255, 0.1)`,
            border: selectedImage ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
            color: selectedImage ? 'white' : 'rgba(255, 255, 255, 0.7)'
          }}
          // title={selectedImage ? "Change Image" : "Upload Image"}
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : selectedImage ? (
            <ImageIcon className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </Tooltip>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
};

export default ImageUploader;
