const axios = require('axios');

exports.main = async (context) => {
    const { refresh_token, clientid, clientsecret, collectionId, properties, schema, dataSourceId } = context.parameters;

    // Log context and all parameters received from the client
    console.log("Received context parameters:", JSON.stringify(context.parameters));

    // Check and log each missing parameter
    if (!refresh_token) console.error("Missing parameter: refresh_token");
    if (!clientid) console.error("Missing parameter: clientid");
    if (!clientsecret) console.error("Missing parameter: clientsecret");
    if (!collectionId) console.error("Missing parameter: collectionId");
    if (!properties) console.error("Missing parameter: properties");
    if (!schema) console.error("Missing parameter: schema");
    if (!dataSourceId) console.error("Missing parameter: dataSourceId");

    if (!refresh_token || !clientid || !clientsecret || !collectionId || !properties || !schema || !dataSourceId) {
        console.error("Missing required parameters.");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing required parameters." })
        };
    }

    try {
        // Log the values of all parameters to ensure they are passed correctly
        console.log("refreshToken:", refresh_token);
        console.log("clientid:", clientid);
        console.log("clientsecret:", clientsecret);
        console.log("collectionId:", collectionId);
        console.log("properties:", properties);
        console.log("schema:", schema);
        console.log("dataSourceId:", dataSourceId);

        const url = "https://marqembed.fastgenapp.com/update-data3";

        const requestBody = {
            refresh_token,
            clientid,
            clientsecret,
            collectionId,
            properties,
            schema,
            dataSourceId
        };

        // Log the request body to ensure it's being sent as expected
        console.log("Request body being sent to update-data3:", JSON.stringify(requestBody));

        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            const newRefreshToken = response.data.new_refresh_token || ''; // Extract new refresh token, default to empty if not found
            console.log("Data updated successfully via update-data3, new refresh token:", newRefreshToken);
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    status: 'success', 
                    new_refresh_token: newRefreshToken, // Send new_refresh_token to the client
                    data: response.data 
                })
            };
        } else {
            console.error("Failed to update data via update-data3", response.status, response.data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    error: 'Failed to update data via update-data3', 
                    new_refresh_token: '', // Set new_refresh_token to blank on failure
                    details: response.data 
                })
            };
        }
    } catch (error) {
        console.error("Error in updateData3:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "An error occurred while updating the data", 
                new_refresh_token: '', // Set new_refresh_token to blank on error
                details: error.message 
            })
        };
    }
};
