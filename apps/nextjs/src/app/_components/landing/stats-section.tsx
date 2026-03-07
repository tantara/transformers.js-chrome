const stats = [
  { value: "0.8B", label: "Model Parameters" },
  { value: "~40", label: "Tokens per Second" },
  { value: "0", label: "Data Sent to Servers" },
  { value: "100%", label: "Local & Private" },
];

export function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ocean-light to-ocean-mid px-4 py-14 sm:px-6 sm:py-20 md:py-28">
      {/* Wave top */}
      <div className="absolute top-0 right-0 left-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path
            d="M0 60V20C360 0 720 40 1080 20C1260 10 1380 30 1440 20V60H0Z"
            className="fill-background"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-white dark:text-ocean-text drop-shadow-sm sm:text-4xl md:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-medium text-white/70 dark:text-ocean-text/60">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wave bottom */}
      <div className="absolute right-0 bottom-0 left-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path
            d="M0 0C360 40 720 0 1080 30C1260 45 1380 10 1440 30V60H0V0Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
}
