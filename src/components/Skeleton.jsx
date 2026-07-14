import React from 'react';

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />;
}

export function SkeletonText({ className = '' }) {
  return <div className={`animate-pulse bg-white/5 rounded h-4 ${className}`} />;
}

export function StatSkeleton() {
  return (
    <div className="bg-card rounded-xl3 border border-line shadow-card p-5">
      <Skeleton className="w-10 h-10 rounded-2xl mb-3" />
      <Skeleton className="w-20 h-7 mb-2" />
      <Skeleton className="w-16 h-3" />
    </div>
  );
}
