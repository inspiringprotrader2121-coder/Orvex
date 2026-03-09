import { AIService } from "./service";

// Compatibility layer for older parts of the app
export const generateJSON = async (prompt: string, system: string) => {
  // This is basically a legacy wrapper
  return AIService.generateLaunchPack({
    name: "Legacy Product",
    category: "General",
    targetAudience: "General",
    baseDescription: prompt
  });
}

export const Prompts = {
  etsyListing: {
    system: "You generate SEO product listings.",
    buildPrompt: (name: string, description: string) => `Product: ${name}\nDescription: ${description}`
  }
}
