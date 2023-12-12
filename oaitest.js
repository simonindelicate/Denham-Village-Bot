require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
    try {
        const openai = new OpenAI(process.env.OPENAI_API_KEY);

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{"role": "user", "content": "Hello, who won the World Series in 2020?"}],
        });

        console.log("Response:", response.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error);
    }
}

testOpenAI();
