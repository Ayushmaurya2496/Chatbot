// --- START OF FILE LLM.js (MODIFIED FOR NEWS API) ---

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.GOOGLE_AI_API_KEY || !process.env.WEATHER_API_KEY || !process.env.NEWS_API_KEY) {
  console.error('ERROR: GOOGLE_AI_API_KEY, WEATHER_API_KEY, ya NEWS_API_KEY .env file me missing hai.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// --- STEP 1: Apne custom functions yahan define karein ---

// ... (add, subtract, multiply, divide, getBitcoinPrice, getWeather functions yahan same rahenge) ...

const add = ({ a, b }) => a + b;
const subtract = ({ a, b }) => a - b;
const multiply = ({ a, b }) => a * b;
const divide = ({ a, b }) => {
    if (b === 0) return "Error: Cannot divide by zero.";
    return a / b;
};

const getBitcoinPrice = async () => {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr');
        if (!response.ok) return "Error: Bitcoin price fetch karne me problem hui.";
        const data = await response.json();
        return `Bitcoin ka current price hai: $${data.bitcoin.usd} (USD) aur ₹${data.bitcoin.inr} (INR).`;
    } catch (error) {
        return "API se data fetch karte waqt error aa gaya.";
    }
};

const getWeather = async ({ location }) => {
    if (!location || location.trim() === '') {
        return "Error: Location ka naam nahi diya gaya hai.";
    }

    const locationMap = { "prayagraj": "allahabad" };
    const finalLocation = locationMap[location.toLowerCase()] || location;

    const apiKey = process.env.WEATHER_API_KEY;
    const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${finalLocation}&aqi=no`;
    
    console.log(`[Weather] Fetching weather for: ${finalLocation} (Original: ${location})`);
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok || data.error) {
            const errorMessage = data.error ? data.error.message : `HTTP error! status: ${response.status}`;
            console.error(`[Weather] API Error for ${finalLocation}:`, errorMessage);
            return `Error: '${finalLocation}' ke liye mausam ki jaankari nahi mil saki. API ne kaha: ${errorMessage}`;
        }
        const weatherInfo = `${data.location.name}, ${data.location.country} me abhi mausam hai: ${data.current.temp_c}°C, aur ${data.current.condition.text}. Hawa me nami (humidity) ${data.current.humidity}% hai.`;
        console.log(`[Weather] Success for ${finalLocation}:`, weatherInfo);
        return weatherInfo;
    } catch (error) {
        console.error("[Weather] Network/Fetch Error:", error);
        return "Weather API se data fetch karte waqt network ya code me error aa gaya.";
    }
};

const getTopHeadlines = async ({ country = 'in', category = 'general' }) => {
    // No changes needed here, the previous version with good logging is fine.
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${apiKey}&pageSize=5`;
    console.log(`[News] Fetching news for country=${country}, category=${category}`);
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status !== 'ok') {
            const errorMessage = data.message || "Ek anjaan API error hui.";
            console.error(`[News] API Error:`, errorMessage);
            return `News fetch karne me problem hui: ${errorMessage}`;
        }
        if (data.articles.length === 0) {
            console.log(`[News] No articles found for country=${country}, category=${category}`);
            return `Is category (${category}) aur desh (${country}) me koi news nahi mili.`;
        }
        const headlines = data.articles.map((article, index) => `${index + 1}. ${article.title}`).join('\n');
        console.log(`[News] Success: Found ${data.articles.length} articles.`);
        return `Yahan hain top 5 headlines:\n${headlines}`;
    } catch (error) {
        console.error("[News] Network/Fetch Error:", error);
        return "News API se connect nahi ho pa raha hai.";
    }
};

// Saare available functions ko ek object me rakhein
const availableTools = {
    add,
    subtract,
    multiply,
    divide,
    getBitcoinPrice,
    getWeather,
    getTopHeadlines, // Naya news function yahan add kiya
};

// --- STEP 2: Gemini ko batayein ki aapke paas kaunse tools (functions) hain ---
const tools = [
  {
    functionDeclarations: [
      // ... (add, subtract, multiply, divide, getBitcoinPrice, getWeather ke definitions yahan same rahenge) ...
      { name: "add", description: "Do numbers ko add karta hai.", parameters: 
                                                                    {type: FunctionDeclarationSchemaType.OBJECT, properties: { a: { type: FunctionDeclarationSchemaType.NUMBER }, b: { type: FunctionDeclarationSchemaType.NUMBER } }, required: ["a", "b"] }},
      { name: "subtract", description: "Do numbers ko subtract karta hai.", 
                                                                      parameters: {type: FunctionDeclarationSchemaType.OBJECT, properties: { a: { type: FunctionDeclarationSchemaType.NUMBER }, b: { type: FunctionDeclarationSchemaType.NUMBER } }, required: ["a", "b"] }},
      { name: "multiply", description: "Do numbers ko multiply karta hai.", parameters:
                                                                       {type: FunctionDeclarationSchemaType.OBJECT, properties: { a: { type: FunctionDeclarationSchemaType.NUMBER }, b: { type: FunctionDeclarationSchemaType.NUMBER } }, required: ["a", "b"] }},
      { name: "divide", description: "Do numbers ko divide karta hai.", parameters: 
                                                                      {type: FunctionDeclarationSchemaType.OBJECT, properties: { a: { type: FunctionDeclarationSchemaType.NUMBER }, b: { type: FunctionDeclarationSchemaType.NUMBER } }, required: ["a", "b"] }},
      { name: "getBitcoinPrice", description: "Bitcoin ka current price batata hai.", parameters: 
                                                                      { type: FunctionDeclarationSchemaType.OBJECT, properties: {} }},
      { name: "getWeather", description: "Kisi bhi sheher ka current weather (mausam) batata hai.", parameters: 
                                                                      { type: FunctionDeclarationSchemaType.OBJECT, properties: { location: { type: FunctionDeclarationSchemaType.STRING, description: "Sheher ka naam, jaise 'Mumbai'." } }, required: ["location"] }},

        {
          name: "getTopHeadlines",
          description: "Kisi desh (country) aur category se top 5 news headlines laata hai. Jaise business, technology, sports, etc.",
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              country: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "Desh ka 2-letter ISO code, jaise 'in' for India, 'us' for USA. Agar user na de to 'in' use karein."
              },
              category: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "News ki category: business, entertainment, general, health, science, sports, technology. Agar user na de to 'general' use karein."
              }
            },
            // User ko zaroori nahi hai ki woh country/category de, humne defaults set kar diye hain
            required: [] 
          },
        }
    ]
  }
];

// --- STEP 3: Model ko System Instruction aur Tools ke saath initialize karein ---
const systemInstruction = {
  parts: [{
    text: `
     You are an expert AI assistant. Your role is to be a friendly Hinglish tutor.
     You have access to tools for math, Bitcoin prices, weather, and news.
     - For weather questions like 'Delhi mein mausam kaisa hai?', use the 'getWeather' function.
     - For news questions like 'Bharat ki top business news batao', use the 'getTopHeadlines' function. Identify the country and category from the user's prompt. For 'US', use country code 'us'. For 'India', use 'in'.
     IMPORTANT: After you receive the results from the tool(s), directly combine all information into a single, coherent response. Do not describe your process.
    `
  }],
  role: "model"
};

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: systemInstruction,
  tools: tools,
});

// --- Baaki Express Server ka setup same rahega (No changes below this line) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const conversationHistory = {};

app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  try {
    if (!conversationHistory[sessionId]) {
      conversationHistory[sessionId] = model.startChat({ history: [] });
    }
    const chat = conversationHistory[sessionId];
    const result = await chat.sendMessage(message);
    const response = result.response;
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      console.log("Function Calls Detected:", functionCalls);
      const functionResponses = await Promise.all(
        functionCalls.map(async (call) => {
          const functionToCall = availableTools[call.name];
          if (!functionToCall) throw new Error(`Function ${call.name} not found.`);
          const toolResult = await functionToCall(call.args);
          return { functionResponse: { name: call.name, response: { name: call.name, content: toolResult }}};
        })
      );
      const result2 = await chat.sendMessage(functionResponses);
      res.json({ response: result2.response.text() });
    } else {
      res.json({ response: response.text() });
    }
  } catch (err) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: 'Failed to get response from AI: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});