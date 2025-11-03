import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { zodToJsonSchema } from "@alcyone-labs/zod-to-json-schema";
import { readFileSync } from "fs";
import { join } from "path";
import { I18N_CONSTANTS } from "./shared/i18nConstants.js";

// Zod schema for multi-source database structure (matches MultiSourceEditModal format)
const MultiSourceDatabaseSchema = z.object({
  title: z.string().min(1, "Database title is required"),
  description: z.string().optional(),
  dataSources: z.array(
    z.object({
      name: z.string().min(1, "Data source name is required"),
      description: z.string().optional(),
      properties: z.record(
        z.string(),
        z.object({
          title: z.object({}).optional(),
          rich_text: z.object({}).optional(),
          number: z
            .object({
              format: z
                .enum([
                  "number",
                  "percent",
                  "dollar",
                  "euro",
                  "pound",
                  "yen",
                  "ruble",
                  "rupee",
                  "won",
                  "yuan",
                ])
                .optional(),
            })
            .optional(),
          select: z
            .object({
              options: z.array(
                z.object({
                  name: z.string(),
                  color: z
                    .enum([
                      "default",
                      "gray",
                      "brown",
                      "orange",
                      "yellow",
                      "green",
                      "blue",
                      "purple",
                      "pink",
                      "red",
                    ])
                    .optional(),
                })
              ),
            })
            .optional(),
          multi_select: z
            .object({
              options: z.array(
                z.object({
                  name: z.string(),
                  color: z
                    .enum([
                      "default",
                      "gray",
                      "brown",
                      "orange",
                      "yellow",
                      "green",
                      "blue",
                      "purple",
                      "pink",
                      "red",
                    ])
                    .optional(),
                })
              ),
            })
            .optional(),
          date: z.object({}).optional(),
          people: z.object({}).optional(),
          files: z.object({}).optional(),
          checkbox: z.object({}).optional(),
          url: z.object({}).optional(),
          email: z.object({}).optional(),
          phone_number: z.object({}).optional(),
          created_time: z.object({}).optional(),
          created_by: z.object({}).optional(),
          last_edited_time: z.object({}).optional(),
          last_edited_by: z.object({}).optional(),
        })
      ),
    })
  ),
});

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Function to load the system prompt from file
function loadSystemPrompt() {
  try {
    // In Netlify Functions, we can use process.cwd() to get the current working directory
    const promptPath = join(process.cwd(), "netlify", "functions", "prompts", "gemini-chat-prompt.txt");
    return readFileSync(promptPath, "utf8");
  } catch (error) {
    console.error("Error loading system prompt:", error);
    // Fallback to a basic prompt if file loading fails
    return `You are an AI assistant. Respond in {responseLanguage}. User request: {message}`;
  }
}

export async function handler(event, context) {
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { message, context: userContext, language = I18N_CONSTANTS.DEFAULT_LOCALE } = JSON.parse(event.body);

    if (!message) {
      const errorMsg = I18N_CONSTANTS.ERROR_MESSAGES.MESSAGE_REQUIRED[language] || 
                       I18N_CONSTANTS.ERROR_MESSAGES.MESSAGE_REQUIRED[I18N_CONSTANTS.DEFAULT_LOCALE];
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: errorMsg }),
      };
    }

    // Use the language passed from the frontend
    const detectedLanguage = language;
    
    // Get language name for AI context
    const responseLanguage = I18N_CONSTANTS.LANGUAGE_NAMES[detectedLanguage] || 
                             I18N_CONSTANTS.LANGUAGE_NAMES[I18N_CONSTANTS.DEFAULT_LOCALE];

    console.log(`🌍 LANGUAGE DEBUG:`);
    console.log(`   Detected Language: ${detectedLanguage}`);
    console.log(`   Response Language: ${responseLanguage}`);
    console.log(`   Available Languages:`, Object.keys(I18N_CONSTANTS.LANGUAGE_NAMES));

    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API key not configured" }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try multiple models with fallback
    const models = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
    let model = null;
    let lastError = null;

    for (const modelName of models) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        break; // If we get here, the model is available
      } catch (error) {
        console.log(`Model ${modelName} not available, trying next...`);
        lastError = error;
        continue;
      }
    }

    if (!model) {
      throw new Error(`No available models. Last error: ${lastError?.message}`);
    }

    // Load system prompt from file and replace placeholders
    const promptTemplate = loadSystemPrompt();
    const schemaStructure = JSON.stringify(
      zodToJsonSchema(MultiSourceDatabaseSchema, { name: "MultiSourceDatabaseSchema" }),
      null,
      2
    );
    
    const systemPrompt = promptTemplate
      .replace(/{responseLanguage}/g, responseLanguage)
      .replace(/{message}/g, message)
      .replace(/{schemaStructure}/g, schemaStructure);

    console.log(`📝 PROMPT DEBUG:`);
    console.log(`   Response Language in prompt: ${responseLanguage}`);
    console.log(`   First 200 chars of prompt:`, systemPrompt.substring(0, 200));

    // Generate response with retry logic
    let result = null;
    let response = null;
    let text = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        result = await model.generateContent(systemPrompt);
        response = await result.response;
        text = response.text();
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.log(`Attempt ${retryCount} failed:`, error.message);

        if (retryCount >= maxRetries) {
          throw error; // Re-throw if we've exhausted retries
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Try to extract JSON schema from the response
    let schema = null;
    let explanation = text;

    // First try to find JSON in code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsedSchema = JSON.parse(jsonMatch[1]);
        console.log('Parsed schema from code block: gemini-chat', JSON.stringify(parsedSchema, null, 2));
        // Validate the schema using Zod
        const validatedSchema = MultiSourceDatabaseSchema.parse(parsedSchema);
        schema = validatedSchema;
        explanation = text.substring(0, jsonMatch.index).trim();
      } catch (e) {
        console.error("Failed to parse or validate JSON schema:", e);
        // Try to find JSON without code blocks
        const directJsonMatch = text.match(/\{[\s\S]*\}/);
        if (directJsonMatch) {
          try {
            const parsedSchema = JSON.parse(directJsonMatch[0]);
            console.log('Parsed schema from direct JSON:', parsedSchema);
            const validatedSchema = MultiSourceDatabaseSchema.parse(parsedSchema);
            schema = validatedSchema;
            explanation = text.substring(0, directJsonMatch.index).trim();
          } catch (e2) {
            console.error("Failed to parse direct JSON:", e2);
          }
        }
      }
    } else {
      // Try to find JSON without code blocks
      const directJsonMatch = text.match(/\{[\s\S]*\}/);
      if (directJsonMatch) {
        try {
          const parsedSchema = JSON.parse(directJsonMatch[0]);
          console.log('Parsed schema from direct JSON (no code block):', parsedSchema);
          const validatedSchema = MultiSourceDatabaseSchema.parse(parsedSchema);
          schema = validatedSchema;
          explanation = text.substring(0, directJsonMatch.index).trim();
        } catch (e) {
          console.error("Failed to parse direct JSON:", e);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: explanation,
        schema: schema,
      }),
    };
  } catch (error) {
    console.error("Error in gemini-chat function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
}