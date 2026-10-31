// Loading placeholders shaped like the real content, so the page doesn't jump when it arrives.
// The shimmer is the `.skeleton` class in globals.css and stops under reduced motion.

/** One grey shape. Sizes come from `className`. */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}

/** A match card while it loads: two crests and names, the kickoff time, both odds bars and the button. */
export function GameCardSkeleton() {
  return (
    <div className="glass flex flex-col gap-3.5 rounded-[24px] p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {[0, 1].map((side) => (
          <span key={side} className={`flex flex-col items-center gap-1.5 ${side === 1 ? "col-start-3" : ""}`}>
            <Bone className="h-10 w-10 rounded-full" />
            <Bone className="h-4 w-20 rounded-md" />
          </span>
        ))}
        <span className="col-start-2 row-start-1 flex flex-col items-center gap-1">
          <Bone className="h-6 w-20 rounded-md" />
          <Bone className="h-3 w-10 rounded" />
        </span>
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2">
          <Bone className="h-4 w-20 rounded-md" />
          <Bone className="h-[30px] rounded-[9px]" />
        </div>
      ))}
      <Bone className="h-11 rounded-[14px]" />
    </div>
  );
}

/** A plain card while it loads: a title line and a few shorter lines. */
export function CardSkeleton({ lines = 2, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`glass flex flex-col gap-2.5 p-4 ${className}`}>
      <Bone className="h-5 w-2/3 rounded-md" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className={`h-3.5 rounded ${i === lines - 1 ? "w-1/2" : "w-full"}`} />
      ))}
    </div>
  );
}
