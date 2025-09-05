"use client";

import React from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
}

export default function VideoPlayer({
  src,
  poster,
  title,
  autoPlay = false,
  controls = true,
  className = ""
}: VideoPlayerProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <video
        src={src}
        poster={poster}
        controls={controls}
        autoPlay={autoPlay}
        className="w-full h-auto rounded-lg shadow-lg"
        preload="metadata"
        style={{ maxHeight: '70vh' }}
      >
        <p className="text-gray-500 text-center p-4">
          Your browser does not support the video tag.
        </p>
      </video>
      
      {title && (
        <div className="mt-2">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
      )}
    </div>
  );
}
