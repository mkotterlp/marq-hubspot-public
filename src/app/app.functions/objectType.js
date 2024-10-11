const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // User ID for token management
    const objectTypeId = context.parameters?.objectTypeId;

    if (!objectTypeId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'objectTypeId is required but was not provided' })
        };
    }

    try {
        // Define the API endpoint to fetch the object schema by ID
        const url = `https://api.hubapi.com/crm/v3/schemas/${objectTypeId}`;

        // Make the API call to fetch the object schema
        const objectSchemaResponse = await makeApiCall(userId, 'GET', url);

        const objectType = objectSchemaResponse.name;

        return {
            statusCode: 200,
            body: JSON.stringify({ objectType })
        };
    } catch (error) {
        console.error(`Error fetching object schema: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};



















// const hubspot = require('@hubspot/api-client');

// exports.main = async (context) => {
//     // Initialize HubSpot client with API key from environment variables or secrets
//     const hubspotClient = new hubspot.Client({
//         accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
//       });    

//     const objectTypeId = context.parameters?.objectTypeId;

//     if (!objectTypeId) {
//         return {
//             statusCode: 400,
//             body: JSON.stringify({ error: 'objectTypeId is required but was not provided' })
//         };
//     }

//     try {
//         const objectSchemaResponse = await hubspotClient.crm.schemas.coreApi.getById(objectTypeId);
//         const objectType = objectSchemaResponse.name;

//         return {
//             statusCode: 200,
//             body: JSON.stringify({ objectType })
//         };
//     } catch (error) {
//         console.error(`Error fetching object schema: ${error.message}`);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: error.message })
//         };
//     }
// };
