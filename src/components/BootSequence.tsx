import { motion } from 'motion/react';
import { Terminal, Zap, Shield, Cpu } from 'lucide-react';

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center font-mono p-8 overflow-hidden">
      <div className="w-full max-w-lg space-y-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-4 text-matrix mb-8"
        >
          <Terminal size={32} />
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic">TERMUX_PRO_SYS_INIT</h1>
        </motion.div>

        <div className="space-y-2 text-[10px] uppercase tracking-widest text-[#444]">
          <BootLine text="Initializing secure kernel..." delay={0.2} />
          <BootLine text="Loading matrix_engine_v4.0.2" delay={0.5} />
          <BootLine text="Mapping remote sectors..." delay={0.8} />
          <BootLine text="Establishing P2P mobile bridge..." delay={1.1} />
          <BootLine text="Bypassing Knox restrictions..." delay={1.4} />
          <BootLine text="Injecting root_toolkit..." delay={1.7} />
          <BootLine text="System integrity: OPTIMAL" delay={2.0} color="text-matrix" />
        </div>

        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          onAnimationComplete={onComplete}
          className="w-full h-1 bg-matrix transform origin-left shadow-[0_0_15px_#00FF41]"
        />

        <div className="flex justify-between items-center text-[9px] text-muted">
          <div className="flex items-center gap-4">
            <Zap size={10} /> BUS_PWR: 100%
          </div>
          <div className="flex items-center gap-4">
            <Shield size={10} /> FIREWALL: ON
          </div>
          <div className="flex items-center gap-4">
            <Cpu size={10} /> PROC: AMD-8C
          </div>
        </div>
      </div>
      
      {/* Background glitch effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#00FF41_1px,_transparent_1px)] bg-[size:20px_20px]" />
      </div>
    </div>
  );
}

function BootLine({ text, delay, color = "text-muted" }: { text: string, delay: number, color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`flex items-center gap-2 ${color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-30"></span>
      {text}
    </motion.div>
  );
}
