import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Orbit, Wind, Moon, Thermometer, Bookmark } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    icon: Moon,
    title: 'Pre-load your dark cycle',
    body: 'Begin dimming your suite lights 90 minutes before orbital dusk. The cabin AI mirrors a Kyoto autumn sunset — let it.',
    metric: 'LUX 12 → 0.3',
  },
  {
    num: '02',
    icon: Thermometer,
    title: 'Drop core temperature',
    body: 'Set the sleep pod to 17.5°C. At altitude, your body sheds heat slower — the terracotta thermal mesh compensates.',
    metric: '17.5°C / 63.5°F',
  },
  {
    num: '03',
    icon: Wind,
    title: 'Breathe on the 4–7–8 loop',
    body: 'The recycled air carries 2% more oxygen than sea level. Slow your intake or you will feel weightless before you mean to.',
    metric: 'O₂ +2.0%',
  },
  {
    num: '04',
    icon: Orbit,
    title: 'Anchor to one sunrise',
    body: 'You will pass through 16 dawns tonight. Choose a single one — 05:42 station time — and let the rest blur past the glass.',
    metric: '16 DAWNS / NIGHT',
  },
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const step = STEPS[activeStep];
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B0A08] p-6 md:p-12 font-['Archivo']">
      <link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@1,400;1,500;1,600&family=Archivo:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 18px 2px rgba(201,111,74,0.55), 0 0 60px 8px rgba(201,111,74,0.18); }
          50% { box-shadow: 0 0 26px 5px rgba(201,111,74,0.8), 0 0 90px 14px rgba(201,111,74,0.28); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1100%); }
        }
        @keyframes dashFlow { to { stroke-dashoffset: -200; } }
        .grid-bg {
          background-image:
            linear-gradient(rgba(156,175,148,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(156,175,148,0.07) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .glow-dot { animation: pulseGlow 3.2s ease-in-out infinite; }
        .scan { animation: scanline 7s linear infinite; }
        .orbit-ring { animation: orbitSpin 28s linear infinite; transform-origin: center; }
        .flow-line { stroke-dasharray: 6 8; animation: dashFlow 4s linear infinite; }
        ::selection { background: #C96F4A; color: #0B0A08; }
      `}} />

      {/* The carousel slide — square format */}
      <div className="relative w-full max-w-[760px]">

        {/* Slide frame */}
        <div className="relative aspect-square w-full bg-[#14120E] border border-[#2A261F] overflow-hidden">

          {/* background grid */}
          <div className="absolute inset-0 grid-bg" />

          {/* scanline */}
          <div className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-[#9CAF94]/5 to-transparent scan pointer-events-none" />

          {/* corner registration marks */}
          {[['top-4 left-4','border-t border-l'],['top-4 right-4','border-t border-r'],['bottom-4 left-4','border-b border-l'],['bottom-4 right-4','border-b border-r']].map(([pos, b], i) => (
            <div key={i} className={`absolute ${pos} w-5 h-5 ${b} border-[#9CAF94]/60`} />
          ))}

          {/* ============ TOP BAR ============ */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 pt-9 z-20">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C96F4A] glow-dot" />
              <span className="font-['Space_Mono'] text-[11px] tracking-[0.3em] text-[#EDE6DC]">HALCYON ORBITAL</span>
            </div>
            <span className="font-['Space_Mono'] text-[11px] tracking-[0.25em] text-[#9CAF94]">FIELD GUIDE · NO.03</span>
          </div>

          {/* ============ ASYMMETRIC GRID ⅓ + ⅔ ============ */}
          <div className="absolute inset-0 grid grid-cols-3 pt-24 pb-20 z-10">

            {/* ——— LEFT COLUMN (⅓) ——— */}
            <div className="col-span-1 border-r border-[#2A261F] flex flex-col justify-between px-8 pb-2">

              {/* vertical label */}
              <div className="flex items-start gap-5">
                <div className="w-px h-28 bg-gradient-to-b from-[#C96F4A] to-transparent" />
                <p className="font-['Space_Mono'] text-[10px] tracking-[0.35em] text-[#7A8A72] [writing-mode:vertical-rl] leading-relaxed">
                  ALT 38,000 M — STRATOSPHERIC SUITE
                </p>
              </div>

              {/* serif pull-quote */}
              <div className="space-y-6">
                <div className="font-['Space_Mono'] text-[44px] leading-none text-[#C96F4A]">
                  {step.num}
                </div>
                <p className="font-['Cormorant'] italic text-[26px] leading-[1.25] text-[#EDE6DC]">
                  “The body keeps earth-time long after the earth lets go of you.”
                </p>
                <p className="font-['Space_Mono'] text-[10px] tracking-[0.25em] text-[#9CAF94]">
                  — RESIDENT PHYSIOLOGIST, DECK 7
                </p>
              </div>

              {/* mini orbit diagram */}
              <div className="relative w-20 h-20 mt-6">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#2A261F" strokeWidth="1" />
                  <circle cx="40" cy="40" r="22" fill="none" stroke="#9CAF94" strokeWidth="0.75" strokeOpacity="0.5" className="flow-line" />
                  <g className="orbit-ring">
                    <circle cx="40" cy="6" r="3" fill="#C96F4A" />
                  </g>
                  <circle cx="40" cy="40" r="6" fill="#3A4434" />
                  <circle cx="40" cy="40" r="6" fill="none" stroke="#9CAF94" strokeWidth="1" />
                </svg>
              </div>
            </div>

            {/* ——— RIGHT COLUMN (⅔) ——— */}
            <div className="col-span-2 flex flex-col px-10 pb-2">

              {/* headline */}
              <div className="mb-8">
                <p className="font-['Space_Mono'] text-[11px] tracking-[0.3em] text-[#C96F4A] mb-3">HOW TO</p>
                <h1 className="text-[#EDE6DC] font-['Archivo'] font-light text-[40px] leading-[1.05] tracking-tight">
                  Sleep above<br />
                  the weather<span className="text-[#C96F4A]">.</span>
                </h1>
              </div>

              {/* step selector rail */}
              <div className="flex gap-2 mb-7">
                {STEPS.map((s, i) => (
                  <button
                    key={s.num}
                    onClick={() => setActiveStep(i)}
                    className={`group relative flex-1 h-[52px] border transition-all duration-300 ${
                      i === activeStep
                        ? 'border-[#C96F4A] bg-[#1E1812]'
                        : 'border-[#2A261F] bg-[#14120E] hover:border-[#9CAF94]/60'
                    }`}
                  >
                    <span className={`font-['Space_Mono'] text-[12px] tracking-widest transition-colors ${
                      i === activeStep ? 'text-[#C96F4A]' : 'text-[#6B6457] group-hover:text-[#9CAF94]'
                    }`}>{s.num}</span>
                    {i === activeStep && (
                      <motion.div layoutId="rail" className="absolute -bottom-px left-0 right-0 h-[2px] bg-[#C96F4A]"
                        style={{ boxShadow: '0 0 12px rgba(201,111,74,0.8)' }} />
                    )}
                  </button>
                ))}
              </div>

              {/* active step card */}
              <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full border border-[#2A261F] bg-[#17150F] p-7 flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* sage glow corner */}
                    <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(156,175,148,0.18) 0%, transparent 70%)' }} />

                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <h2 className="text-[#EDE6DC] font-['Archivo'] font-medium text-[22px] tracking-tight mb-3">
                          {step.title}
                        </h2>
                        <p className="text-[#A39B8B] font-['Archivo'] font-light text-[15px] leading-[1.65] max-w-[380px]">
                          {step.body}
                        </p>
                      </div>
                      <div className="shrink-0 w-14 h-14 border border-[#3A4434] bg-[#10140D] flex items-center justify-center"
                        style={{ boxShadow: 'inset 0 0 18px rgba(156,175,148,0.12)' }}>
                        <StepIcon size={22} className="text-[#9CAF94]" strokeWidth={1.5} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-5 mt-5 border-t border-[#2A261F]">
                      <span className="font-['Space_Mono'] text-[11px] tracking-[0.2em] text-[#C96F4A]">
                        ▸ {step.metric}
                      </span>
                      <span className="font-['Cormorant'] italic text-[17px] text-[#9CAF94]">
                        protocol {step.num} of 04
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ============ BOTTOM BAR ============ */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-10 pb-8 z-20">
            <span className="font-['Space_Mono'] text-[10px] tracking-[0.3em] text-[#6B6457]">
              SLIDE 03 / 07
            </span>
            <div className="flex items-center gap-1.5">
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} className={`h-[3px] transition-all ${i === 2 ? 'w-7 bg-[#C96F4A]' : 'w-3 bg-[#3A352C]'}`}
                  style={i === 2 ? { boxShadow: '0 0 8px rgba(201,111,74,0.7)' } : {}} />
              ))}
            </div>
            <div className="flex items-center gap-2 text-[#9CAF94]">
              <span className="font-['Space_Mono'] text-[10px] tracking-[0.25em]">SWIPE</span>
              <ArrowRight size={13} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* ——— mock IG controls below the slide ——— */}
        <div className="mt-5 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveStep((activeStep + STEPS.length - 1) % STEPS.length)}
              className="w-9 h-9 border border-[#2A261F] flex items-center justify-center text-[#A39B8B] hover:border-[#C96F4A] hover:text-[#C96F4A] transition-colors">
              <ArrowLeft size={15} />
            </button>
            <button
              onClick={() => setActiveStep((activeStep + 1) % STEPS.length)}
              className="w-9 h-9 border border-[#2A261F] flex items-center justify-center text-[#A39B8B] hover:border-[#C96F4A] hover:text-[#C96F4A] transition-colors">
              <ArrowRight size={15} />
            </button>
            <span className="font-['Space_Mono'] text-[11px] tracking-[0.2em] text-[#6B6457] ml-2">
              @halcyon.orbital
            </span>
          </div>
          <button
            onClick={() => setSaved(!saved)}
            className={`flex items-center gap-2 px-4 h-9 border font-['Space_Mono'] text-[11px] tracking-[0.2em] transition-all ${
              saved ? 'border-[#9CAF94] text-[#9CAF94] bg-[#10140D]' : 'border-[#2A261F] text-[#A39B8B] hover:border-[#9CAF94]'
            }`}>
            <Bookmark size={13} fill={saved ? '#9CAF94' : 'none'} />
            {saved ? 'SAVED' : 'SAVE GUIDE'}
          </button>
        </div>
      </div>
    </div>
  );
}