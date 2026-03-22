import { Navbar } from "../navbar";
import { Footer } from "../footer";
import { HeroSection } from "./hero-section";
import { PlatformSection } from "./platform-section";
import { FeatureSection } from "./feature-section";
import { StatsSection } from "./stats-section";
import { CtaSection } from "./cta-section";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />

      {/* Platforms */}
      <PlatformSection />

      {/* Section 1: muted bg */}
      <div id="features">
        <FeatureSection
          badge="Private by Design"
          headline="Your data never leaves your device."
          description="All AI inference runs locally — in the browser via WebGPU, on your phone via Metal, or on your desktop via llama.cpp. No servers, no API calls, no telemetry."
          features={[
            {
              title: "100% Local Inference",
              description:
                "Models run entirely on your device. No data is transmitted anywhere.",
            },
            {
              title: "Cached for Speed",
              description:
                "Model files are cached locally. Subsequent launches load in seconds.",
            },
            {
              title: "Works Offline",
              description:
                "Once the model is downloaded, everything works without internet.",
            },
          ]}
          stat={{ value: "0 bytes", label: "sent to any server" }}
          imagePosition="right"
          background="ocean"
          imageSrc="/example-summarize.jpg"
          imageAlt="Text summarization demo showing the Chrome extension summarizing a research paper"
        />
      </div>

      {/* Section 2: default bg */}
      <FeatureSection
        badge="Vision + Text"
        headline="Understand images and text together."
        description="Multimodal models process images and text locally on your device. Upload a photo and ask questions — no cloud needed."
        features={[
          {
            title: "Image Understanding",
            description:
              "Describe photos, read handwriting, analyze charts and diagrams.",
          },
          {
            title: "Multi-Image Support",
            description:
              "Upload multiple images in a single conversation for comparison and analysis.",
          },
          {
            title: "Drag & Drop Upload",
            description:
              "Simply drag images into the chat or use the file picker.",
          },
        ]}
        stat={{ value: "0.8B params", label: "compact yet capable" }}
        imagePosition="left"
        imageSrc="/example-image-caption.jpg"
        imageAlt="Image captioning demo showing the extension describing a Grand Canyon photo"
      />

      {/* Section 3: muted bg */}
      <FeatureSection
        badge="Full Control"
        headline="Tune the model to your needs."
        description="Adjust temperature, top-p, top-k, repetition penalty, and more. A local AI playground with fine-grained control over generation behavior."
        features={[
          {
            title: "Generation Settings",
            description:
              "Temperature, top-p, top-k, min-p, repetition penalty — all adjustable in real-time.",
          },
          {
            title: "Real-Time Metrics",
            description:
              "See tokens per second, time-to-first-token, and total generation time.",
          },
          {
            title: "Stop & Reset",
            description:
              "Interrupt generation at any time. Clear the conversation and start fresh.",
          },
        ]}
        stat={{ value: "~40 tok/s", label: "on modern laptops" }}
        imagePosition="right"
        background="ocean"
        imageSrc="/example-write-code.jpg"
        imageAlt="Code generation demo showing the extension writing Python code with generation settings"
      />

      {/* Section 4: default bg */}
      <StatsSection />

      <CtaSection />

      <Footer />
    </div>
  );
}
