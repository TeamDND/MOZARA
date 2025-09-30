import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  onPrimaryImageSelect: (file: File | null) => void;
  onSecondaryImageSelect: (file: File | null) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onPrimaryImageSelect, onSecondaryImageSelect }) => {
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
  const [secondaryPreview, setSecondaryPreview] = useState<string | null>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
    previewSetter: (url: string | null) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setter(file);
      previewSetter(URL.createObjectURL(file));
    } else {
      setter(null);
      previewSetter(null);
    }
  };

  const UploadBox: React.FC<{ 
    preview: string | null;
    onClick: () => void;
    label: string;
    altText: string;
  }> = ({ preview, onClick, label, altText }) => (
    <div 
      className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-200 hover:border-gray-400 transition-colors"
      onClick={onClick}
    >
      {preview ? (
        <img src={preview} alt={altText} className="w-full h-full object-cover rounded-lg" />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );

  return (
    <div className="flex justify-center items-center gap-8 my-8">
      <input
        type="file"
        accept="image/*"
        ref={primaryInputRef}
        className="hidden"
        onChange={(e) => handleImageChange(e, onPrimaryImageSelect, setPrimaryPreview)}
      />
      <input
        type="file"
        accept="image/*"
        ref={secondaryInputRef}
        className="hidden"
        onChange={(e) => handleImageChange(e, onSecondaryImageSelect, setSecondaryPreview)}
      />
      <UploadBox 
        preview={primaryPreview} 
        onClick={() => primaryInputRef.current?.click()} 
        label="Top-down 이미지"
        altText="Top-down preview"
      />
      <UploadBox 
        preview={secondaryPreview} 
        onClick={() => secondaryInputRef.current?.click()} 
        label="Side (Right/Left) 이미지"
        altText="Side preview"
      />
    </div>
  );
};

export default ImageUpload;