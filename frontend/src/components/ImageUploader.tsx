import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faImage, faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";

interface ImageUploaderProps {
  value?: string | File;
  onChange: (file: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  showPreview?: boolean;
  acceptCamera?: boolean;
  acceptGallery?: boolean;
  maxSizeMB?: number;
  className?: string;
  previewHeightClass?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  onRemove,
  disabled = false,
  showPreview = true,
  acceptCamera = true,
  acceptGallery = true,
  maxSizeMB = 10,
  className = "",
  previewHeightClass = "h-48",
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (value) {
      if (typeof value === "string") {
        setPreview(value);
      } else if (value instanceof File) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(value);
      }
    } else {
      setPreview(null);
    }
  }, [value]);

  const validateFile = (file: File): boolean => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`La imagen debe ser menor a ${maxSizeMB}MB`);
      return false;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)");
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setLoading(true);
      setTimeout(() => {
        onChange(file);
        setLoading(false);
      }, 100);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onChange(null);
    if (onRemove) onRemove();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {showPreview && preview && (
        <div className="relative rounded-lg overflow-hidden border-2 border-accent-4">
          <img src={preview} alt="Preview" className={`w-full ${previewHeightClass} object-cover`} />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-accent-1 text-accent-2 hover:opacity-90 transition-opacity shadow-xl z-10"
              title="Eliminar imagen"
            >
              <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {!preview && !loading && (
        <div className="flex gap-3">
          {acceptCamera && (
            <>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-accent-4 bg-accent-2 py-3 px-3 hover:bg-accent-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faCamera} className="h-5 w-5 text-accent-7" />
                <span className="text-xs font-medium text-accent-1">Tomar Foto</span>
              </button>
            </>
          )}

          {acceptGallery && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-accent-4 bg-accent-2 py-3 px-3 hover:bg-accent-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faImage} className="h-5 w-5 text-accent-7" />
                <span className="text-xs font-medium text-accent-1">Subir Imagen</span>
              </button>
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} spin className="h-8 w-8 text-blue-500" />
        </div>
      )}
    </div>
  );
};
