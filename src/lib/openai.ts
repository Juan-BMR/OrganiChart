// @ts-ignore – external dependency resolved at runtime
import OpenAI from "openai";
// @ts-ignore – SvelteKit env import
import { OPENAI_API_KEY } from "$env/static/private";

// Centralized OpenAI client used across server routes
// Ensure OPENAI_API_KEY is set in your environment or hosting dashboard.
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
}); 