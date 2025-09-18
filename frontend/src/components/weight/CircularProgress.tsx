import React, { useEffect, useState } from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 100,
  strokeWidth = 8,
  showPercentage = false
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Gradient Definition */}
        <defs>
          <linearGradient id={`progressGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B8E6D3" />
            <stop offset="50%" stopColor="#F4C2A1" />
            <stop offset="100%" stopColor="#8D7053" />
          </linearGradient>

          {/* Glow effect */}
          <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />

        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#progressGradient-${size})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 1.5s ease-in-out',
            filter: `url(#glow-${size})`
          }}
        />

        {/* Animated dots at the end of progress */}
        {animatedPercentage > 0 && (
          <circle
            cx={size / 2 + radius * Math.cos((animatedPercentage / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={size / 2 + radius * Math.sin((animatedPercentage / 100) * 2 * Math.PI - Math.PI / 2)}
            r={strokeWidth / 2}
            fill="#8D7053"
            style={{
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
        )}
      </svg>

      {/* Center Text */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">
              {Math.round(animatedPercentage)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Complete
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};
