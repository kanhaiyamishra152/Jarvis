
import React from 'react';
import JSZip from 'jszip';
import { type ImageGenerationData } from '../types';
import { DownloadIcon, RefreshIcon, CheckIcon, CloseIcon } from './Icons';

// Helper function to trigger file downloads
const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

interface ImageGenerationDisplayProps {
  data: ImageGenerationData;
  onRegenerate: () => void;
  onCancel: () => void;
  onConfirm: (confirmed: boolean) => void;
}

const ImageGenerationDisplay: React.FC<ImageGenerationDisplayProps> = ({ data, onRegenerate, onCancel, onConfirm }) => {
    const { status, prompt, images, error, originalPrompt } = data;

    const handleDownloadAll = async () => {
        if (images.length === 0) return;
        const zip = new JSZip();
        const promises = images.map(async (image, index) => {
            const response = await fetch(image.url);
            const blob = await response.blob();
            zip.file(`image_${index + 1}.jpeg`, blob, {binary: true});
        });
        await Promise.all(promises);
        const content = await zip.generateAsync({ type: 'blob' });
        downloadFile(content, 'jarvis-generated-images.zip');
    };

    const latestImage = images.length > 0 ? images[images.length - 1] : null;

    const renderStatusContent = () => {
        switch (status) {
            case 'confirming_prompt':
                return (
                    <div className="p-4 bg-gray-800/30 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Suggested prompt for "{originalPrompt}":</p>
                        <p className="text-base text-cyan-300 italic mb-4">"{prompt}"</p>
                        <div className="flex justify-end items-center gap-3">
                            <button onClick={() => onConfirm(false)} className="px-4 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 rounded-md flex items-center gap-1.5"><CloseIcon className="w-4 h-4" /> Cancel</button>
                            <button onClick={() => onConfirm(true)} className="px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-md flex items-center gap-1.5"><CheckIcon className="w-4 h-4" /> Generate</button>
                        </div>
                    </div>
                );
            case 'generating':
                return (
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-800/30 rounded-lg aspect-square">
                        <RefreshIcon className="w-12 h-12 text-cyan-400 animate-spin" />
                        <p className="mt-4 text-lg font-semibold text-gray-300">Generating your masterpiece...</p>
                        <p className="text-sm text-gray-400 mt-1">This can take a moment.</p>
                    </div>
                );
            case 'done':
                if (!latestImage) return <p>Something went wrong.</p>;
                return (
                    <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                        <div className="aspect-square bg-black flex items-center justify-center">
                            <img src={latestImage.url} alt={latestImage.prompt} className="w-full h-full object-contain" />
                        </div>
                        <div className="p-3 bg-gray-900/50 flex justify-end items-center gap-3 border-t border-gray-700">
                             <a href={latestImage.url} download={`jarvis-image-${images.length}.jpeg`} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-1.5"><DownloadIcon className="w-4 h-4" /> Download</a>
                             <button onClick={onRegenerate} className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-md flex items-center gap-1.5"><RefreshIcon className="w-4 h-4" /> Regenerate</button>
                        </div>
                    </div>
                );
             case 'error':
                 return (
                    <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
                        <p className="font-semibold mb-1">Image Generation Failed</p>
                        <p className="text-sm">{error || "An unknown error occurred."}</p>
                    </div>
                 );
            default:
                return null;
        }
    };
    
    return (
        <div className="my-2">
            <div className="p-4">{renderStatusContent()}</div>
            {images.length > 1 && (
                <div className="p-4 border-t border-gray-700/50">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-300">Generation History ({images.length} images)</h4>
                        <button onClick={handleDownloadAll} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-md flex items-center gap-1.5"><DownloadIcon className="w-4 h-4" /> Download All</button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {images.slice(0, -1).reverse().map((image, index) => (
                             <a key={index} href={image.url} download={`jarvis-image-${images.length - index - 1}.jpeg`} title={image.prompt} className="aspect-square bg-gray-800 rounded-md overflow-hidden group">
                                <img src={image.url} alt={image.prompt} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                             </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGenerationDisplay;