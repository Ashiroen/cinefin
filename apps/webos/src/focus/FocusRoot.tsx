import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type FocusCtx = {
  focused: string | null;
  setFocus: (id: string) => void;
  register: (id: string, el: HTMLElement | null) => void;
};

const Ctx = createContext<FocusCtx | null>(null);

export function FocusRoot({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: string;
}) {
  const [focused, setFocused] = useState<string | null>(initial ?? null);
  const nodes = useRef(new Map<string, HTMLElement>());

  const setFocus = useCallback((id: string) => {
    setFocused(id);
  }, []);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  }, []);

  useEffect(() => {
    if (initial) setFocused(initial);
  }, [initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
      const current = focused ? nodes.current.get(focused) : undefined;
      const boxes = Array.from(nodes.current.entries()).map(([id, el]) => {
        const r = el.getBoundingClientRect();
        return { id, r };
      });
      if (!boxes.length) return;
      e.preventDefault();
      if (!current) {
        setFocused(boxes[0]!.id);
        return;
      }
      const cr = current.getBoundingClientRect();
      const cx = cr.left + cr.width / 2;
      const cy = cr.top + cr.height / 2;
      let best: { id: string; score: number } | null = null;
      for (const b of boxes) {
        if (b.id === focused) continue;
        const bx = b.r.left + b.r.width / 2;
        const by = b.r.top + b.r.height / 2;
        const dx = bx - cx;
        const dy = by - cy;
        let ok = false;
        if (key === 'ArrowRight') ok = dx > 8 && Math.abs(dx) >= Math.abs(dy) * 0.35;
        if (key === 'ArrowLeft') ok = dx < -8 && Math.abs(dx) >= Math.abs(dy) * 0.35;
        if (key === 'ArrowDown') ok = dy > 8 && Math.abs(dy) >= Math.abs(dx) * 0.25;
        if (key === 'ArrowUp') ok = dy < -8 && Math.abs(dy) >= Math.abs(dx) * 0.25;
        if (!ok) continue;
        const dist = dx * dx + dy * dy;
        if (!best || dist < best.score) best = { id: b.id, score: dist };
      }
      if (best) setFocused(best.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

  const value = useMemo(
    () => ({ focused, setFocus, register }),
    [focused, setFocus, register],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFocus() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFocus outside FocusRoot');
  return ctx;
}

export function Focusable({
  id,
  className,
  onSelect,
  children,
  style,
  disabled,
}: {
  id: string;
  className?: string;
  onSelect?: () => void;
  children: ReactNode;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  const { focused, setFocus, register } = useFocus();
  const ref = useRef<HTMLButtonElement>(null);
  const is = !disabled && focused === id;

  useEffect(() => {
    if (disabled) {
      register(id, null);
      return;
    }
    register(id, ref.current);
    return () => register(id, null);
  }, [id, register, disabled]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      data-focusable={id}
      className={`${className ?? ''} ${is ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}
      style={style}
      onMouseEnter={() => {
        if (!disabled) setFocus(id);
      }}
      onClick={() => {
        if (disabled) return;
        setFocus(id);
        onSelect?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && is && !disabled) {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {children}
    </button>
  );
}
