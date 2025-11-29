#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const TARGET_LANGUAGES = ['fr', 'ru'] as const;
const SOURCE_FILE = 'docs/rules/official/en.md';
const GPT_MODEL = 'gpt-4o';

type Language = typeof TARGET_LANGUAGES[number];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function translate(text: string, targetLang: Language): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a game localizer for roleplay servers. Translate naturally while preserving Markdown syntax.`,
      },
      {
        role: "user",
        content: `Translate this DarkRP rulebook to ${targetLang}.

Rules:
- Use simple, clear vocabulary (avoid literary/formal words)
- Keep gaming terms in English: "fading door", "cooldown", "pry bar", "prying", "crowbar", "weed", "RDM/RDA", "NLR", "FearRP", "minging", "raid", "hit", "prop"
- Translate "mug/mugging" with terms meaning "rob/robbery" or "hold up" in the target language
- Preserve all Markdown formatting exactly

${text}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from GPT API');
  }

  return content;
}

async function main(): Promise<void> {
  const sourcePath = path.join(__dirname, '..', SOURCE_FILE);
  const outputDir = path.dirname(sourcePath);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Source file not found at ${sourcePath}`);
    process.exit(1);
  }

  console.log(`Reading source file: ${sourcePath}`);
  const sourceContent = fs.readFileSync(sourcePath, 'utf8');

  await Promise.all(
    TARGET_LANGUAGES.map(async (lang) => {
    console.log(`\nTranslating to ${lang.toUpperCase()}...`);
    try {
      const translatedContent = await translate(sourceContent, lang);
      const outputPath = path.join(outputDir, `${lang}.md`);
      fs.writeFileSync(outputPath, translatedContent, 'utf8');
      console.log(`✓ ${lang.toUpperCase()} translation saved to ${outputPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to translate to ${lang.toUpperCase()}:`, errorMessage);
      process.exit(1);
    }
    })
  );

  console.log('\n✓ All translations complete!');
}

main().catch((error) => {
  console.error('Translation failed:', error);
  process.exit(1);
});
