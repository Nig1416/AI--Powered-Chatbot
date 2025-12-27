require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateResponse(history, newMessage) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
        try {
            // For Gemini, we use the "gemini-2.5-flash" model (Confirmed working)
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Construct chat history (Gemini format: { role: 'user'|'model', parts: [{ text: string }] })
            // Our 'history' array comes as { role: 'user'|'assistant', content: string }
            // We need to map it.
            // Gemini enforces that the first message MUST be from 'user'.
            // If our history starts with 'model' (assistant), it will crash.
            // We find the index of the first 'user' message and slice from there.
            let firstUserIndex = history.findIndex(msg => msg.role === 'user');

            let validHistory = [];
            if (firstUserIndex !== -1) {
                validHistory = history.slice(firstUserIndex);
            }

            const chatHistory = validHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model', // Gemini uses 'model' instead of 'assistant'
                parts: [{ text: msg.content }]
            }));

            const chat = model.startChat({
                history: chatHistory,
                generationConfig: {
                    maxOutputTokens: 200,
                },
            });

            const result = await chat.sendMessage(newMessage);
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error(`Gemini AI Error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message);

            // Check for 429 or 503 errors (Rate limit or Service Unavailable)
            if (error.message.includes('429') || error.message.includes('503')) {
                attempt++;
                if (attempt <= MAX_RETRIES) {
                    const waitTime = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
                    console.log(`Rate limit hit. Retrying in ${waitTime}ms...`);
                    await delay(waitTime);
                    continue;
                }
            }

            // If max retries reached or it's a different error
            if (error.message.includes('429')) {
                return "I'm currently experiencing very high traffic. Please try again in a few moments.";
            }

            return "I apologize, but I encountered a system error. Please try again later.";
        }
    }
}

module.exports = { generateResponse };
