import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel, EmbeddingModel } from "ai";
import { keys } from "../keys";

const openai = createOpenAI({
  apiKey: keys().OPENAI_API_KEY,
});

export const models: {
  chat: LanguageModel;
  embeddings: EmbeddingModel<string>;
} = {
  chat: openai("gpt-4o-mini"),
  embeddings: openai.embedding("text-embedding-3-small"),
};
