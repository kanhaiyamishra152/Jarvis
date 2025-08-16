
import React from 'react';
import { type AIState } from '../types';

interface HolographicFaceProps {
  state: AIState;
  isAwake: boolean;
}

const HolographicFace: React.FC<HolographicFaceProps> = ({ state, isAwake }) => {
  const stateClasses = {
    idle: 'animate-pulse',
    listening: 'animate-spin-slow',
    thinking: 'animate-ping',
    speaking: 'animate-bounce',
  };

  return (
    <div className="relative h-48 flex items-center justify-center p-4">
      <div className={`absolute w-36 h-36 rounded-full bg-cyan-400/10 transition-all duration-500 ${isAwake ? 'scale-100' : 'scale-0'}`}></div>
      <div className={`absolute w-48 h-48 rounded-full border-2 border-cyan-400/20 transition-all duration-500 ${isAwake ? 'scale-100' : 'scale-0'} ${state === 'listening' ? 'animate-ping opacity-50' : ''}`}></div>
      
      <svg
        viewBox="0 0 200 200"
        className={`w-32 h-32 transition-transform duration-300 ${isAwake ? 'scale-100' : 'scale-90 opacity-50'}`}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base circle */}
        <circle cx="100" cy="100" r="80" fill="none" stroke={isAwake ? "rgba(0, 255, 255, 0.4)" : "rgba(0, 255, 255, 0.2)"} strokeWidth="2" filter="url(#glow)" />
        
        {/* State-based animations */}
        {state === 'idle' && (
           <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0, 255, 255, 0.6)" strokeWidth="1" className="animate-pulse" />
        )}
        
        {state === 'speaking' && (
          <path d="M 60 100 Q 100 80 140 100" stroke="rgba(0, 255, 255, 0.8)" strokeWidth="3" fill="none" className="animate-pulse">
            <animate attributeName="d" values="M 60 100 Q 100 80 140 100; M 60 100 Q 100 120 140 100; M 60 100 Q 100 80 140 100" dur="0.5s" repeatCount="indefinite"/>
          </path>
        )}
        
        {state === 'thinking' && (
          <>
            <circle cx="100" cy="100" r="40" stroke="rgba(0, 255, 255, 0.7)" strokeWidth="2" strokeDasharray="10 5" fill="none">
               <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="3s" repeatCount="indefinite" />
            </circle>
             <circle cx="100" cy="100" r="60" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="5 10" fill="none">
               <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="5s" repeatCount="indefinite" />
            </circle>
          </>
        )}
        
        {state === 'listening' && (
           <g>
              <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(0, 255, 255, 0.8)" strokeWidth="2">
                  <animate attributeName="r" values="50;60;50" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
              </circle>
               <circle cx="100" cy="100" r="30" fill="rgba(0, 255, 255, 0.5)">
                   <animate attributeName="r" values="30;35;30" dur="1.5s" repeatCount="indefinite" />
               </circle>
           </g>
        )}

      </svg>
    </div>
  );
};

export default HolographicFace;
