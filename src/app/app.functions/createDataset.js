const axios = require('axios');

exports.main = async (context) => {
    // Extract parameters from the context
    const refresh_token = context.parameters?.refresh_token;
    const clientid = context.parameters?.clientid;
    const clientsecret = context.parameters?.clientsecret;
    const marqAccountId = context.parameters?.marqAccountId;
    const objectName = context.parameters?.objectName;  // Pass the objectType
    const schema = context.parameters?.schema;
    const properties = context.parameters?.properties;

    // Log the parameters for debugging
    console.log("Received parameters for createOrUpdateDataset:", {
        refresh_token,
        clientid,
        clientsecret,
        marqAccountId,
        objectName,
        schema,
        properties
    });

   // Validate required parameters
   if (!refresh_token || !clientid || !clientsecret || !marqAccountId || !schema || !Array.isArray(schema)) {
    console.error("Missing or invalid parameters in createOrUpdateDataset");

    // Log which specific parameter is missing
    if (!refresh_token) console.error("Missing refresh_token");
    if (!clientid) console.error("Missing clientid");
    if (!clientsecret) console.error("Missing clientsecret");
    if (!marqAccountId) console.error("Missing marqAccountId");
    if (!schema || !Array.isArray(schema)) console.error("Missing or invalid schema");

    return {
        statusCode: 400,
        body: JSON.stringify({
            message: "Missing or invalid parameters",
            refresh_token,
            clientid,
            clientsecret,
            marqAccountId,
            objectName,
            schema,
            properties
        })
    };
}

    try {
        // Step 1: Make a POST request to the Fastgen API with the individual parameters
        const response = await axios.post('https://marqembed.fastgenapp.com/create-dataset', {
            refresh_token: refresh_token,
            clientid: clientid,
            clientsecret: clientsecret,
            marqAccountId: marqAccountId,
            objectName,
            schema: schema,
            properties: properties || {} // Default to an empty object if properties are not provided
        });

        // Step 2: Check the response from the Fastgen API
        if (response.status === 200 && response.data.success) {
            const { collectionId, dataSourceId, new_refresh_token } = response.data;
            console.log("Dataset created or updated successfully:", response.data);

            // Step 3: Return the dataset details and new refresh token
            return {
                statusCode: 200,
                body: JSON.stringify({
                    collectionId: collectionId,
                    dataSourceId: dataSourceId,
                    new_refresh_token: new_refresh_token,
                    success: true
                })
            };
        } else {
            console.error("Failed to create or update dataset:", response.data);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: "Failed to create or update dataset",
                    error: response.data
                })
            };
        }
    } catch (error) {
        console.error("Error in createOrUpdateDataset:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message
            })
        };
    }
};
