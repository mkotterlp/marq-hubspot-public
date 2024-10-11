exports.main = async (context) => {
    try {
        // Retrieve API key from context secrets

        const apiKey = process.env['PRIVATE_APP_ACCESS_TOKEN'];
        
        // Check if the API key was successfully retrieved
        if (!apiKey) {
            console.error("API Key retrieval failed: No key found.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "API Key retrieval failed" })
            };
        }
        
        // Log success of API key retrieval
        console.log("API Key successfully retrieved.", apiKey);

        // Return the API key in the response
        return {
            statusCode: 200,
            body: JSON.stringify({ key: apiKey })
        };
    } catch (error) {
        console.error("Error occurred during API key retrieval:", error);

        // Return error response
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
