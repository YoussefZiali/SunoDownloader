import React from 'react';

interface ShimmerSkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';
}

export const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({
  className = 'w-full h-4',
  rounded = 'md',
}) => {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`skeleton-shimmer ${roundedClass} ${className}`}
      aria-hidden="true"
    />
  );
};

export const TrackCardShimmer: React.FC = () => {
  return (
    <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
      <ShimmerSkeleton className="w-full aspect-square" rounded="xl" />
      <div className="space-y-1.5 pt-1">
        <ShimmerSkeleton className="w-3/4 h-4" rounded="md" />
        <ShimmerSkeleton className="w-1/2 h-3" rounded="sm" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <ShimmerSkeleton className="w-12 h-4" rounded="md" />
        <ShimmerSkeleton className="w-16 h-4" rounded="md" />
      </div>
    </div>
  );
};

export const TrackRowShimmer: React.FC = () => {
  return (
    <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ShimmerSkeleton className="w-4 h-4" rounded="sm" />
        <ShimmerSkeleton className="w-12 h-12 shrink-0" rounded="xl" />
        <div className="space-y-1.5 min-w-0 flex-1">
          <ShimmerSkeleton className="w-2/5 h-4" rounded="md" />
          <ShimmerSkeleton className="w-1/4 h-3" rounded="sm" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ShimmerSkeleton className="w-12 h-4" rounded="md" />
        <ShimmerSkeleton className="w-8 h-8" rounded="xl" />
      </div>
    </div>
  );
};
