const axios = require('axios');

exports.main = async (context) => {
    // Extract the parameters sent from handleClick
    const refresh_token = context.parameters?.refresh_token;
    const clientid = context.parameters?.clientid;
    const clientsecret = context.parameters?.clientsecret;
    const marquserId = context.parameters?.marquserId; // Convert userid to string
    // const recordid = string(context.parameters?.recordid); // Convert recordid to string
    const recordid = context.parameters?.recordid; // Convert recordid to string

    const templateid = context.parameters?.templateid;
    const templatetitle = context.parameters?.templatetitle;
    const marqaccountid = context.parameters?.marqaccountid;
    // const datasetid = string(context.parameters?.datasetid);
    const datasetid = context.parameters?.dataSetId;


    // Log the parameters for debugging
    console.log("Received parameters:", {
        refresh_token,
        clientid,
        clientsecret,
        marquserId,
        recordid,
        templateid,
        templatetitle,
        marqaccountid,
        datasetid
    });

    // Check if all required parameters are available
    if (!refresh_token || !clientid || !clientsecret || !marquserId || !recordid || !templateid || !templatetitle || !marqaccountid || !datasetid) {
        console.error("Missing required parameters in createProject");

        return {
            statusCode: 400,

            body: JSON.stringify({ message: "Missing required parameters in createProject.", refresh_token, clientid, clientsecret, marquserId, recordid, templateid, templatetitle, marqaccountid, datasetid})
        };
    }

    try {
        // Step 1: Make a POST request to the Fastgen API with the parameters
        const marqResponse = await axios.post('https://marqembed.fastgenapp.com/create-project', {
            refresh_token: refresh_token,
            clientid: clientid,
            clientsecret: clientsecret,
            marquserId: marquserId,
            recordid: recordid,
            templateid: templateid,
            templatetitle: templatetitle,
            marqaccountid: marqaccountid,
            datasetid: datasetid
        });

        // Step 2: Check the response from the Fastgen API
        if (marqResponse.data.success) {
            const { documentid, new_refresh_token, project_info } = marqResponse.data;
            console.log("Marq project created successfully:", project_info);

            // Step 3: Return the project details along with the new refresh token
            return {
                statusCode: 200,
                body: JSON.stringify({
                    documentid: documentid,
                    new_refresh_token: new_refresh_token,
                    project_info: project_info
                })
            };
        } else {
            console.error("Failed to create Marq project:", marqResponse.data);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Failed to create Marq project", error: marqResponse.data })
            };
        }

    } catch (error) {
        console.error("Error in creating Marq project:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to create Marq project", error: error.message })
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
//         properties: ["projectid", "fileid", "name", "fileurl", "encodedoptions", "hs_createdate", "hs_lastmodifieddate"]
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
