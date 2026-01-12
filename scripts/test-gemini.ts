import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (!rawKeys) {
    console.error("No API keys found in .env");
    return;
  }

  const keys = rawKeys.split(",").map(k => k.trim()).filter(k => !!k);
  
  for (const key of keys) {
    console.log(`\n--- Testing Key: ${key.slice(0, 6)}...${key.slice(-4)} ---`);
    const genAI = new GoogleGenerativeAI(key);
    try {
      // We have to use the REST API or find a way to list models in SDK
      // The SDK doesn't have a direct listModels but we can try a dummy call
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hi");
      console.log("gemini-1.5-flash: SUCCESS");
    } catch (e) {
      console.log(`gemini-1.5-flash: FAILED - ${e.message}`);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const result = await model.generateContent("Hi");
      console.log("gemini-2.0-flash-exp: SUCCESS");
    } catch (e) {
      console.log(`gemini-2.0-flash-exp: FAILED - ${e.message}`);
    }
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent("Hi");
      console.log("gemini-2.5-flash: SUCCESS");
    } catch (e) {
      console.log(`gemini-2.5-flash: FAILED - ${e.message}`);
    }
  }
}

listModels();
