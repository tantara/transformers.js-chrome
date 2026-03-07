interface Feature {
  title: string;
  description: string;
}

interface StatCallout {
  value: string;
  label: string;
}

interface FeatureSectionProps {
  badge: string;
  headline: string;
  description: string;
  features: Feature[];
  stat: StatCallout;
  imagePosition: "left" | "right";
  background?: "default" | "ocean";
}

export function FeatureSection({
  badge,
  headline,
  description,
  features,
  stat,
  imagePosition,
  background = "default",
}: FeatureSectionProps) {
  const isOcean = background === "ocean";

  const content = (
    <div>
      <div className="mb-4">
        <span className="inline-block rounded-full bg-ocean-deep/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ocean-deep">
          {badge}
        </span>
      </div>
      <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
        {headline}
      </h2>
      <p className="mb-6 text-base text-muted-foreground sm:mb-8 sm:text-lg">{description}</p>

      <div className="space-y-5">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ocean-deep text-sm font-bold text-white dark:text-ocean-abyss">
              {i + 1}
            </div>
            <div>
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-muted-foreground">
                {f.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-l-2 border-ocean-deep pl-4">
        <div className="text-2xl font-black text-ocean-deep">{stat.value}</div>
        <div className="text-sm text-muted-foreground">{stat.label}</div>
      </div>
    </div>
  );

  const image = (
    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-ocean-mid/20 bg-gradient-to-br from-ocean-foam to-ocean-shallow p-8">
      <div className="text-center text-ocean-text-muted/40">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="mx-auto mb-2 size-12">
          <path d="M2 12C2 7 7 2 12 2s10 5 10 10-5 10-10 10S2 17 2 12Z" strokeLinecap="round" />
          <path d="M5 12c0-2 1.5-4 3.5-5M12 22c2 0 4-1.5 5-3.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium">Feature illustration</p>
      </div>
    </div>
  );

  return (
    <section
      className={`relative px-4 py-14 sm:px-6 sm:py-20 md:py-28 ${isOcean ? "bg-ocean-foam" : ""}`}
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {imagePosition === "left" ? (
            <>
              <div className="order-2 md:order-1">{image}</div>
              <div className="order-1 md:order-2">{content}</div>
            </>
          ) : (
            <>
              {content}
              {image}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
