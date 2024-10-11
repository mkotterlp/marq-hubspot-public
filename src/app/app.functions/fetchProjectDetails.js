const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // Get the userId for token management
    const objectIds = context.parameters?.objectIds;

    console.log("Received object IDs:", objectIds);

    if (!objectIds || objectIds.length === 0) {
        console.log("No object IDs provided or object IDs array is empty");
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing object IDs." })
        };
    }

    // Prepare the request body for batch retrieving custom object records
    const requestBody = {
        inputs: objectIds.map(id => ({ id: id })),
        properties: [
            "projectid",
            "fileid",
            "name",
            "fileurl",
            "encodedoptions",
            "hs_createdate",
            "hs_lastmodifieddate",
            "originaltemplateid"
        ]
    };

    try {
        console.log("Starting to fetch details for object IDs:", objectIds);

        // Define the URL for batch reading custom object records
        const url = 'https://api.hubapi.com/crm/v3/objects/projects/batch/read';

        // Use makeApiCall to send the request
        const apiResponse = await makeApiCall(userId, 'POST', url, requestBody);

        // Extract the required details from the response
        const projectDetails = apiResponse.results.map(item => ({
            objectId: item.id,
            projectid: item.properties.projectid,
            fileid: item.properties.fileid,
            fileurl: item.properties.fileurl,
            encodedoptions: item.properties.encodedoptions,
            name: item.properties.name,
            hs_createdate: item.properties.hs_createdate,
            originaltemplateid: item.properties.originaltemplateid,
            hs_lastmodifieddate: item.properties.hs_lastmodifieddate
        }));

        console.log("Fetched project details:", projectDetails);

        return {
            statusCode: 200,
            body: JSON.stringify(projectDetails)
        };

    } catch (error) {
        console.error("Error in processing project details:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to fetch project details", error: error.message })
        };
    }
};



















// const hubspot = require('@hubspot/api-client');

// exports.main = async (context) => {
//     const hubspotClient = new hubspot.Client({
//         accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
//       });    
//           const objectIds = context.parameters?.objectIds;

//     console.log("Received object IDs:", objectIds);

//     if (!objectIds || objectIds.length === 0) {
//         console.log("No object IDs provided or object IDs array is empty");
//         return {
//             statusCode: 400,
//             body: JSON.stringify({ message: "Missing object IDs." })
//         };
//     }

//     // Update this to match the correct usage for batch retrieving custom object records
//     const requestBody = {
//         inputs: objectIds.map(id => ({ id: id })),
//         properties: ["projectid", "fileid", "name", "fileurl", "encodedoptions", "hs_createdate", "hs_lastmodifieddate", "originaltemplateid"]
//     };

//     try {
//         console.log("Starting to fetch details for object IDs:", objectIds);

//         // Adjust this to use the correct API endpoint for batch reading custom object records
//         const apiResponse = await hubspotClient.crm.objects.batchApi.read(
//             'projects', // Ensure this is your actual custom object type
//             requestBody
//         );

//         const projectDetails = apiResponse.results.map(item => ({
//             objectId: item.id,  // This assumes that the response includes the object ID
//             projectid: item.properties.projectid,
//             fileid: item.properties.fileid,
//             fileurl: item.properties.fileurl,
//             encodedoptions: item.properties.encodedoptions,
//             name: item.properties.name,
//             hs_createdate: item.properties.hs_createdate,
//             originaltemplateid: item.properties.originaltemplateid,
//             hs_lastmodifieddate: item.properties.hs_lastmodifieddate
//         }));

//         console.log("Fetched project details:", projectDetails);

//         return {
//             statusCode: 200,
//             body: JSON.stringify(projectDetails)
//         };

//     } catch (error) {
//         console.error("Error in processing project details:", error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ message: "Failed to fetch project details", error: error.message })
//         };
//     }
// };
