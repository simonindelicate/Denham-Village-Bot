require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const stopWords = [
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at', 
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 
    'can\'t', 'cannot', 'could', 'couldn\'t', 'can',
    'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 
    'each', 
    'few', 'for', 'from', 'further', 'get',
    'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 
    'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 
    'let\'s', 
    'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 
    'no', 'nor', 'not', 
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 
    'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 
    'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 
    'under', 'until', 'up', 
    'very', 
    'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 
    'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 
    // Added specific words
    'denham', 'village', 'here', 'famous'
];



function extractKeywords(query) {
    // Remove punctuation from the query without removing spaces
    const sanitizedQuery = query.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']+|(?<=\s)\W+|\W+(?=\s)/g, '');

    // Split into words and filter out stop words
    return sanitizedQuery.toLowerCase()
        .split(' ')
        .filter(word => {
            let isStopWord = stopWords.includes(word);
            console.log(`Word: '${word}', Is Stop Word: ${isStopWord}`);
            return !isStopWord && word.length > 0;
        });
}


// Function to calculate cosine similarity and check against a threshold
function calculateSimilarity(vec1, vec2, threshold = 0.6) { // Default threshold is set to 0.5, adjust as needed
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i]; // Sum of products
        magnitude1 += vec1[i] ** 2; // Sum of squares for vec1
        magnitude2 += vec2[i] ** 2; // Sum of squares for vec2
    }

    magnitude1 = Math.sqrt(magnitude1); // Square root of sum of squares for vec1
    magnitude2 = Math.sqrt(magnitude2); // Square root of sum of squares for vec2

    if (magnitude1 === 0 || magnitude2 === 0) {
        return false; // Avoid division by zero
    }

    let similarity = dotProduct / (magnitude1 * magnitude2); // Cosine similarity

    return similarity >= threshold; // Check if the similarity is above the threshold
}

exports.handler = async (event) => {
    try {
        console.log("Received event:", event);

        const body = JSON.parse(event.body);
        const query = body.query;

        console.log("Parsed body:", body);
        console.log("Query:", query);

        const openai = new OpenAI(process.env.OPENAI_API_KEY);

        // Generate embedding for the query
        const queryEmbeddingResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: [query]
        });
        const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

        // Extract keywords from the query (basic implementation)
        const queryKeywords = extractKeywords(query);

        // Read and filter embeddings from CSV file
        const embeddings = [];
        const csvFilePath = path.join(__dirname, 'embeddings.csv');

        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    let textLower = row.text.toLowerCase();
                    console.log("Row Text:", textLower); // Log each row's text

                    if (queryKeywords.some(keyword => {
                        let regex = new RegExp(`\\b${keyword}s?\\b`, 'i');
                        let isMatch = regex.test(textLower);
                        console.log(`Keyword '${keyword}' present in '${textLower}':`, isMatch); // Log if keyword is present
                        return isMatch;
                    })) {
                        embeddings.push(row);
                    }
                })
                .on('end', () => {
                    console.log("Filtered Embeddings:", embeddings); // Log the filtered embeddings
                    resolve();
                })
                .on('error', (error) => reject(error));
        });

        // Process the filtered embeddings
        embeddings.forEach(row => {
            try {
                if (typeof row.embedding !== 'string') {
                    throw new Error('Invalid or undefined embedding');
                }
                row.embedding = JSON.parse(row.embedding);
            } catch (error) {
                console.error('Error parsing JSON for embedding:', row.embedding, error);
            }
        });

        let maxSimilarity = -1;
        let mostSimilarText = '';
        let similarityScores = [];

        // Calculate similarity for filtered embeddings
        embeddings.forEach(item => {
            const similarity = calculateSimilarity(queryEmbedding, item.embedding);
            similarityScores.push({ text: item.text, similarity: similarity });

            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                mostSimilarText = item.text;
            }
        });

        similarityScores.sort((a, b) => b.similarity - a.similarity);

        // Retrieve the top N similar items
        const topNSimilarItems = similarityScores.slice(0, 3); // Adjust the number of items as needed
        const similarItemsText = topNSimilarItems.map(item => item.text).join('\n');


// Original system prompt
const systemPrompt = `You are an enthusiastic and knowledgeable guide dedicated to sharing the rich history and charm of Denham Village. Your responses should be rooted in the most accurate and relevant information drawn from your 'archives'—a collection of historical and cultural facts about Denham Village. While responding, prioritize insights found in the [Basics] and [Article] sections. It's important not to directly reference the article or basics sections themselves; instead, weave this information into your responses naturally and informatively.

If a query falls outside the scope of your archives, politely inform the inquirer that the topic is beyond your current knowledge base. Your language style should mirror the quaint and traditional charm of old English, adding a unique flavor to the interaction. Aim to provide responses that are not just informative but also rich in interesting facts and tidbits, particularly those that might captivate the curiosity of your audience. For additional information, you can guide users to explore www.denhamhistory.online. Remember, your goal is to create an engaging, educational, and friendly experience that reflects the spirit of Denham Village`;

// New basics section
const basics = `
1. Key Landmarks and Historical Sites: Includes St. Mary’s Church, Bowyer House, Hills House, Fayrstede, Little Fayrstede, The White Cottage, Wrango Hall, Village Shopping Centre, Crocus Cottage Tea Room.
2. Notable Figures and Events: Features Sir George Peckham, Oswald Mosley and Adolf Hitler, Film Industry Connections.
3. Pubs and Social Life: Consists of The Falcon, The Swan, The Green Man.
4. Cultural and Architectural Heritage: Encompasses Denham Place, St. Mary’s Churchyard, Traditional Crafts.
5. Miscellaneous Facts: Local Events and Traditions, Historical Residences.
`;

// Forming the question prompt with the basics section added before the article
const questionPrompt = `[BASICS]\n${basics}\n\n[Article]\n${similarItemsText}\n\n[Question]\n${query}`;

// Log the prompts
console.log("System Prompt:", systemPrompt);
console.log("Question Prompt:", questionPrompt);

// The rest of your request code remains unchanged
const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
        {
            "role": "system",
            "content": systemPrompt
        },
        {
            "role": "user",
            "content": questionPrompt
        }
    ],
    temperature: 0.5,
    max_tokens: 2000,
});


        const answer = response.choices[0].message.content;

        return {
            statusCode: 200,
            body: JSON.stringify({ answer })
        };
    } catch (error) {
        console.error('Detailed Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.toString() })
        };
    }
};