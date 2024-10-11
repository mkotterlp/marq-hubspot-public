const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // Get the userId for token management
    const objectId = context.parameters?.objectId;
    const objectTypeId = context.parameters?.objectTypeId;

    console.log("Received object ID:", objectId);
    console.log("Received object Type ID:", objectTypeId);

    if (!objectId || !objectTypeId) {
        console.log("Object ID or Object Type ID is missing");
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing object ID or object Type ID." })
        };
    }

    try {
        // Determine the properties to fetch based on the object type
        const stageProperty = objectTypeId === '0-1' ? 'hs_lead_status' : 'dealstage'; // Adjust based on your object type IDs

        // Use the batch API to fetch the object details
        const url = `https://api.hubapi.com/crm/v3/objects/${objectTypeId}/batch/read`;
        const requestBody = {
            inputs: [{ id: objectId }],
            properties: [stageProperty]
        };

        const apiResponse = await makeApiCall(userId, 'POST', url, requestBody);

        if (!apiResponse || !apiResponse.results || apiResponse.results.length === 0) {
            throw new Error('Failed to fetch object details');
        }

        const objectDetails = apiResponse.results[0];
        const stage = objectDetails.properties[stageProperty] || 'default';

        return {
            statusCode: 200,
            body: JSON.stringify({ stage })
        };
    } catch (error) {
        console.error('Error:', {
            message: error.message,
            statusCode: error.statusCode,
            body: error.body,
            stack: error.stack,
        });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while processing your request.', details: error.message }),
        };
    }
};



















// const hubspot = require('@hubspot/api-client');

// exports.main = async (context) => {
//     const hubspotClient = new hubspot.Client({
//         accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
//     });

//     const objectId = context.parameters?.objectId;
//     const objectTypeId = context.parameters?.objectTypeId;

//     console.log("Received object ID:", objectId);
//     console.log("Received object Type ID:", objectTypeId);

//     if (!objectId || !objectTypeId) {
//         console.log("Object ID or Object Type ID is missing");
//         return {
//             statusCode: 400,
//             body: JSON.stringify({ message: "Missing object ID or object Type ID." })
//         };
//     }

//     try {
//         // Determine the properties to fetch based on the object type
//         const stageProperty = objectTypeId === '0-1' ? 'hs_lead_status' : 'dealstage'; // Adjust based on your object type IDs
        
//         // Use the batch API to fetch the object details
//         const requestBody = {
//             inputs: [{ id: objectId }],
//             properties: [stageProperty]
//         };

//         const apiResponse = await hubspotClient.crm.objects.batchApi.read(
//             objectTypeId, // Use the objectTypeId directly
//             requestBody
//         );

//         if (!apiResponse || !apiResponse.results || apiResponse.results.length === 0) {
//             throw new Error('Failed to fetch object details');
//         }

//         const objectDetails = apiResponse.results[0];
//         const stage = objectDetails.properties[stageProperty] || 'default';

//         return {
//             statusCode: 200,
//             body: JSON.stringify({ stage })
//         };
//     } catch (error) {
//         console.error('Error:', {
//             message: error.message,
//             statusCode: error.statusCode,
//             body: error.body,
//             stack: error.stack,
//         });
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: 'An error occurred while processing your request.', details: error.message }),
//         };
//     }
// };
