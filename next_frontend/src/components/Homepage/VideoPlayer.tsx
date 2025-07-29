'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { Parallax } from 'react-scroll-parallax';

interface VideoPlayerProps {
  url: string;
  className?: string;
}

const VideoPlayer = ({ url, className = '' }: VideoPlayerProps) => {
  const getEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0`;
    }
    
    // Handle youtu.be URLs with parameters
    if (url.includes('youtube.com/')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0`;
      }
    }
    
    return url;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <Parallax
      speed={-1}
      className={`w-full aspect-video rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden group shadow-2xl ${className}`}
      translateY={[10, -5]}
      shouldAlwaysCompleteAnimation
    >
      <div className="relative w-full h-full">
        <div className="absolute inset-0 w-full h-full">
          <iframe
            src={embedUrl}
            className="w-full h-full object-cover"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video player"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/10 to-black/30" />
      </div>
    </Parallax>
  );
};

export default memo(VideoPlayer);
