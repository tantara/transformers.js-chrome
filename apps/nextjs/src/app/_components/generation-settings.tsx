"use client";

interface GenerationConfig {
  do_sample: boolean;
  temperature: number;
  top_p: number;
  top_k: number;
  min_p: number;
  repetition_penalty: number;
  max_new_tokens: number;
}

interface Props {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between sm:hidden">
        <label className="text-ocean-text-muted text-xs">{label}</label>
        <span className="font-mono text-xs">{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-ocean-text-muted hidden w-32 shrink-0 text-xs sm:block">
          {label}
        </label>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="bg-ocean-shallow accent-ocean-deep h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
        />
        <span className="hidden w-12 text-right font-mono text-xs sm:block">{value}</span>
      </div>
    </div>
  );
}

export function GenerationSettings({ config, onChange }: Props) {
  const update = (key: keyof GenerationConfig, value: number | boolean) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-ocean-shallow/50 space-y-3 rounded-lg border border-ocean-mid/20 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Generation Settings</h3>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={config.do_sample}
            onChange={(e) => update("do_sample", e.target.checked)}
            className="accent-ocean-deep"
          />
          Sampling
        </label>
      </div>

      <Slider
        label="Temperature"
        value={config.temperature}
        min={0}
        max={2}
        step={0.1}
        onChange={(v) => update("temperature", v)}
      />
      <Slider
        label="Top P"
        value={config.top_p}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => update("top_p", v)}
      />
      <Slider
        label="Top K"
        value={config.top_k}
        min={0}
        max={100}
        step={1}
        onChange={(v) => update("top_k", v)}
      />
      <Slider
        label="Min P"
        value={config.min_p}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => update("min_p", v)}
      />
      <Slider
        label="Rep. Penalty"
        value={config.repetition_penalty}
        min={1}
        max={2}
        step={0.05}
        onChange={(v) => update("repetition_penalty", v)}
      />
      <Slider
        label="Max Tokens"
        value={config.max_new_tokens}
        min={64}
        max={4096}
        step={64}
        onChange={(v) => update("max_new_tokens", v)}
      />
    </div>
  );
}
