import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Log {
  id: string;
  text: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'command';
  timestamp: string;
}

interface TerminalEngineProps {
  logs: Log[];
}

export default function TerminalEngine({ logs, onCommand }: { logs: Log[], onCommand?: (cmd: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (onCommand) onCommand(input);
    setInput('');
  };

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 bg-black/40 font-mono text-[11px] leading-relaxed"
    >
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto no-scrollbar"
      >
        <div className="mb-2 text-white opacity-40 italic">*** TERMUX SECURE SHELL v4.0.2-pro ***</div>
        
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-1 break-words ${
                log.type === 'error' ? 'text-danger shadow-[0_0_8px_rgba(255,62,62,0.2)]' :
                log.type === 'success' ? 'text-matrix shadow-[0_0_8px_rgba(0,255,65,0.2)]' :
                log.type === 'warning' ? 'text-warning shadow-[0_0_8px_rgba(255,161,22,0.1)]' :
                log.type === 'command' ? 'text-white' :
                'text-matrix/70'
              }`}
            >
              <span className="opacity-40 mr-2">[{log.timestamp}]</span>
              {log.type === 'command' && <span className="text-matrix mr-2 font-bold">$</span>}
              {log.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t border-edge/30 bg-black/60 flex items-center gap-2">
        <span className="text-matrix font-bold shrink-0">termux@android:~$</span>
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-transparent text-white focus:outline-none flex-1 font-mono"
          autoFocus
        />
        <div className="w-2 h-4 bg-matrix animate-pulse shrink-0"></div>
      </form>
    </div>
  );
}
