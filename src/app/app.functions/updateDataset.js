const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

// Helper function for logging request parameters
const logRequestParameters = (objectType, datasetid, collectionid) => {
    console.log("Received parameters:", {
        objectType, datasetid, collectionid
    });
};

// Helper function for throwing errors if parameters are missing
const validateParameters = (objectType, datasetid, collectionid) => {
    if (!objectType || !datasetid || !collectionid) {
        const missingParams = {
            objectType: objectType || 'missing',
            datasetid: datasetid || 'missing',
            collectionid: collectionid || 'missing',
        };
        throw new Error(`Missing required parameters: ${JSON.stringify(missingParams)}`);
    }
};

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // User ID for token management
    const objectType = context.parameters?.objectType;
    const datasetid = context.parameters?.datasetid;
    const collectionid = context.parameters?.collectionid;

    // Log the received parameters
    logRequestParameters(objectType, datasetid, collectionid);

    try {
        // Validate required parameters
        validateParameters(objectType, datasetid, collectionid);

        // Fetch all tables to find the marq_account_data table
        const tablesUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
        const tablesResponse = await makeApiCall(userId, 'GET', tablesUrl);

        if (!tablesResponse?.results) {
            throw new Error('Failed to fetch tables from HubDB.');
        }

        // Find the table with the name 'marq_account_data'
        let accountTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');
        if (!accountTable) {
            throw new Error('Table marq_account_data not found.');
        }

        const tableId = accountTable.id;
        console.log(`Table marq_account_data found with ID: ${tableId}`);

        // Fetch all rows from the marq_account_data table
        const rowsUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
        const rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);

        if (!rowsResponse?.results) {
            throw new Error('Failed to fetch rows from the marq_account_data table.');
        }

        // Find the row with the matching objectType
        const existingRow = rowsResponse.results.find(row => row.values.objectType.toLowerCase() === objectType.toLowerCase());
        if (!existingRow) {
            throw new Error(`ObjectType ${objectType} not found in the marq_account_data table.`);
        }

        // Update the row with new values
        const updateRowUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows/${existingRow.id}/draft`;
        const rowValues = { datasetid, collectionid };

        // Update the draft row with new values
        await makeApiCall(userId, 'PATCH', updateRowUrl, { values: rowValues });
        console.log(`ObjectType ${objectType} updated with new datasetid and collectionid.`);

        // Publish the updated table
        const publishTableUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
        await makeApiCall(userId, 'POST', publishTableUrl);
        console.log('Table marq_account_data published after updating the row.');

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `ObjectType ${objectType} updated successfully in HubDB.` }),
        };
    } catch (error) {
        console.error("Error occurred:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to update HubDB table with new data' }),
        };
    }
};



















// const hubspot = require('@hubspot/api-client');

// // Helper function for logging request parameters
// const logRequestParameters = (objectType, datasetid, collectionid) => {
//     console.log("Received parameters:", {
//         objectType, datasetid, collectionid
//     });
// };

// // Helper function for throwing errors if parameters are missing
// const validateParameters = (objectType, datasetid, collectionid) => {
//     if (!objectType || !datasetid || !collectionid) {
//         const missingParams = {
//             objectType: objectType || 'missing',
//             datasetid: datasetid || 'missing',
//             collectionid: collectionid || 'missing',
//         };
//         throw new Error(`Missing required parameters: ${JSON.stringify(missingParams)}`);
//     }
// };

// exports.main = async (context) => {
//     const objectType = context.parameters?.objectType;
//     const datasetid = context.parameters?.datasetid;
//     const collectionid = context.parameters?.collectionid;

//     // Log the received parameters
//     logRequestParameters(objectType, datasetid, collectionid);

//     try {
//         // Validate required parameters
//         validateParameters(objectType, datasetid, collectionid);

//         // Initialize the HubSpot client with the private app access token
//         const hubspotClient = new hubspot.Client({ accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'] });

//         // Fetch the marq_account_data table
//         const tableId = await fetchMarqAccountDataTable(hubspotClient);
        
//         // Update the row corresponding to the objectType
//         await updateTableRow(hubspotClient, tableId, objectType, { datasetid, collectionid });

//         // Publish the updated table
//         await publishTable(hubspotClient, tableId);

//         return {
//             statusCode: 200,
//             body: JSON.stringify({ message: `ObjectType ${objectType} updated successfully in HubDB.` })
//         };

//     } catch (error) {
//         console.error("Error occurred:", error.message);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: error.message || 'Failed to update HubDB table with new data' })
//         };
//     }
// };

// // Helper function to fetch the marq_account_data table
// const fetchMarqAccountDataTable = async (hubspotClient) => {
//     const tablesResponse = await hubspotClient.cms.hubdb.tablesApi.getAllTables();
//     if (!tablesResponse?.results) {
//         throw new Error('Failed to fetch tables from HubDB.');
//     }

//     const accountTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');
//     if (!accountTable) {
//         throw new Error('Table marq_account_data not found.');
//     }

//     console.log(`Table marq_account_data found with ID: ${accountTable.id}`);
//     return accountTable.id;
// };

// // Helper function to update the table row with new data
// const updateTableRow = async (hubspotClient, tableId, objectType, rowData) => {
//     const rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
//     if (!rowsResponse?.results) {
//         throw new Error('Failed to fetch rows from the marq_account_data table.');
//     }

//     const existingRow = rowsResponse.results.find(row => row.values.objectType.toLowerCase() === objectType.toLowerCase());
//     if (!existingRow) {
//         throw new Error(`ObjectType ${objectType} not found in the marq_account_data table.`);
//     }

//     // Update the draft row with new values
//     await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableId, existingRow.id, { values: rowData });
//     console.log(`ObjectType ${objectType} updated with new datasetid and collectionid.`);
// };

// // Helper function to publish the table
// const publishTable = async (hubspotClient, tableId) => {
//     await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
//     console.log('Table marq_account_data published after updating the row.');
// };









// // const hubspot = require('@hubspot/api-client');

// // exports.main = async (context) => {
// //     // Read the parameters from the request
// //     const objectType = context.parameters?.objectType;  // Use objectType 
// //     const refreshToken = context.parameters?.refreshToken; 
// //     const datasetid = context.parameters?.datasetid;  
// //     const collectionid = context.parameters?.collectionid;  
// //     const accountId = context.parameters?.accountId;  // Also include accountId

// //     console.log("objectType:", objectType);
// //     console.log("refreshToken:", refreshToken);
// //     console.log("datasetid:", datasetid);
// //     console.log("collectionid:", collectionid);
// //     console.log("accountId:", accountId);

// //     // Check if all required parameters are provided
// //     if (!objectType || !refreshToken || !datasetid || !collectionid || !accountId) {
// //         console.error("Error: Missing required parameters.");
// //         return {
// //             statusCode: 400,
// //             body: JSON.stringify({ "objectType": objectType, "refreshToken": refreshToken, "datasetid": datasetid, "collectionid": collectionid, "accountId": accountId }),
// //         };
// //     }

// //     try {
// //         // Initialize the HubSpot client with the private app access token
// //         const hubspotClient = new hubspot.Client({
// //             accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
// //         });

// //         // Fetch all tables to find the marq_account_data table
// //         const tablesResponse = await hubspotClient.cms.hubdb.tablesApi.getAllTables();
// //         if (!tablesResponse || !tablesResponse.results) {
// //             throw new Error('Failed to fetch tables');
// //         }

// //         // Find the table with the name 'marq_account_data'
// //         let accountTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');
// //         if (!accountTable) {
// //             throw new Error('Table marq_account_data not found.');
// //         }

// //         const tableId = accountTable.id;
// //         console.log('Table marq_account_data found with ID:', tableId);

// //         // Fetch all rows from the marq_account_data table
// //         const rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
// //         if (!rowsResponse || !rowsResponse.results) {
// //             throw new Error('Failed to fetch rows from the table');
// //         }

// //         // Find the row with the matching objectType
// //         let existingRow = rowsResponse.results.find(row => row.values.objectType === objectType);
// //         if (!existingRow) {
// //             throw new Error(`ObjectType ${objectType} not found in the table.`);
// //         }

// //         // Update the row with the new refreshToken, datasetid, collectionid, and accountId
// //         const rowValues = {
// //             datasetid: datasetid,  
// //             collectionid: collectionid,
// //         };

// //         // Update the draft row with new values
// //         await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableId, existingRow.id, { values: rowValues });
// //         console.log(`ObjectType ${objectType} updated in the table with new datasetid, collectionid.`);

// //         // Publish the table after updating the row
// //         await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
// //         console.log('Table marq_account_data published after updating the row.');

// //         return {
// //             statusCode: 200,
// //             body: JSON.stringify({
// //                 message: `ObjectType ${objectType} updated successfully in HubDB.`,
// //             }),
// //         };
// //     } catch (error) {
// //         console.error("Error updating HubDB table:", error);
// //         return {
// //             statusCode: 500,
// //             body: JSON.stringify({ error: 'Failed to update HubDB table with new data' }),
// //         };
// //     }
// // };








// // ORIGINAL
// // const hubspot = require('@hubspot/api-client');

// // exports.main = async (context) => {
// //     // Read the parameters from the request
// //     const accountId = String(context.parameters?.accountId); // Use accountId
// //     const refreshToken = context.parameters?.refreshToken; 
// //     const datasetid = context.parameters?.datasetid;  
// //     const collectionid = context.parameters?.collectionid;      

// //     console.log("accountId:", accountId);
// //     console.log("refreshToken:", refreshToken);
// //     console.log("datasetid:", datasetid);
// //     console.log("collectionid:", collectionid);

// //     // Check if all required parameters are provided
// //     if (!accountId || !refreshToken || !datasetid || !collectionid) {
// //         console.error("Error: Missing required parameters.");
// //         return {
// //             statusCode: 400,
// //             body: JSON.stringify({ "accountId:": accountId, "refreshToken:": refreshToken, "datasetid:": datasetid, "collectionid:": collectionid }),
// //         };
// //     }

// //     try {
// //         // Initialize the HubSpot client with the private app access token
// //         const hubspotClient = new hubspot.Client({
// //             accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
// //         });

// //         // Fetch all tables to find the marq_account_data table
// //         const tablesResponse = await hubspotClient.cms.hubdb.tablesApi.getAllTables();
// //         if (!tablesResponse || !tablesResponse.results) {
// //             throw new Error('Failed to fetch tables');
// //         }

// //         // Find the table with the name 'marq_account_data'
// //         let accountTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');
// //         if (!accountTable) {
// //             throw new Error('Table marq_account_data not found.');
// //         }

// //         const tableId = accountTable.id;
// //         console.log('Table marq_account_data found with ID:', tableId);

// //         // Fetch all rows from the marq_account_data table
// //         const rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
// //         if (!rowsResponse || !rowsResponse.results) {
// //             throw new Error('Failed to fetch rows from the table');
// //         }

// //         // Find the row with the matching accountId
// //         let existingUserRow = rowsResponse.results.find(row => row.values.accountId === accountId);
// //         if (!existingUserRow) {
// //             throw new Error(`Account ${accountId} not found in the table.`);
// //         }

// //         // Update the row with the new refreshToken, datasetid, and collectionid
// //         const rowValues = {
// //             refreshToken: refreshToken,
// //             datasetid: datasetid,  // Use correct spelling
// //             collectionid: collectionid
// //         };

// //         // Update the draft row with new values
// //         await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableId, existingUserRow.id, { values: rowValues });
// //         console.log(`Account ${accountId} updated in the table with new refreshToken, datasetid, and collectionid.`);

// //         // Publish the table after updating the row
// //         await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
// //         console.log('Table marq_account_data published after updating the row.');

// //         return {
// //             statusCode: 200,
// //             body: JSON.stringify({
// //                 message: `Account ${accountId} updated successfully in HubDB.`,
// //             }),
// //         };
// //     } catch (error) {
// //         console.error("Error updating HubDB table:", error);
// //         return {
// //             statusCode: 500,
// //             body: JSON.stringify({ error: 'Failed to update HubDB table with new data' }),
// //         };
// //     }
// // };

