const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // User ID for token management
    const refreshToken = context.parameters?.refreshToken;

    console.log("refreshToken:", refreshToken);

    try {
        // Fetch all tables to find the marq_account_data table
        const tablesUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
        const tablesResponse = await makeApiCall(userId, 'GET', tablesUrl);

        if (!tablesResponse || !tablesResponse.results) {
            throw new Error('Failed to fetch tables');
        }

        // Find the table with the name 'marq_account_data'
        let accountTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');
        if (!accountTable) {
            throw new Error('Table marq_account_data not found.');
        }

        const tableId = accountTable.id;
        console.log('Table marq_account_data found with ID:', tableId);

        // Fetch all rows from the marq_account_data table
        const rowsUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
        const rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);

        if (!rowsResponse || !rowsResponse.results) {
            throw new Error('Failed to fetch rows from the table');
        }

        // Find the row with the matching objectType
        let existingRow = rowsResponse.results.find(row => row.values.objectType === 'data');
        if (!existingRow) {
            throw new Error(`Data row not found in the table.`);
        }

        // Update the row with the new refreshToken
        const updateRowUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows/${existingRow.id}/draft`;
        const rowValues = {
            refreshToken: refreshToken,
        };

        // Update the draft row with new values
        await makeApiCall(userId, 'PATCH', updateRowUrl, { values: rowValues });
        console.log(`Data row updated in the table with new refresh token.`);

        // Publish the table after updating the row
        const publishUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
        await makeApiCall(userId, 'POST', publishUrl);
        console.log('Table marq_account_data published after updating the row.');

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Data row refresh token updated successfully in HubDB.`,
            }),
        };
    } catch (error) {
        console.error("Error updating HubDB table:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update HubDB table with new data' }),
        };
    }
};



















// const hubspot = require('@hubspot/api-client');

// exports.main = async (context) => {
//     // Read the parameters from the request
//     const refreshToken = context.parameters?.refreshToken; 


//     console.log("refreshToken:", refreshToken);


//     try {
//         // Initialize the HubSpot client with the private app access token
//         const hubspotClient = new hubspot.Client({
//             accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
//         });

//         // Fetch all tables to find the marq_account_data table
//         const tablesResponse = await hubspotClient.cms.hubdb.tablesApi.getAllTables();
//         if (!tablesResponse || !tablesResponse.results) {
//             throw new Error('Failed to fetch tables');
//         }

//         // Find the table with the name 'marq_account_data'
//         let accountTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');
//         if (!accountTable) {
//             throw new Error('Table marq_account_data not found.');
//         }

//         const tableId = accountTable.id;
//         console.log('Table marq_account_data found with ID:', tableId);

//         // Fetch all rows from the marq_account_data table
//         const rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
//         if (!rowsResponse || !rowsResponse.results) {
//             throw new Error('Failed to fetch rows from the table');
//         }

//         // Find the row with the matching objectType
//         let existingRow = rowsResponse.results.find(row => row.values.objectType === 'data');
//         if (!existingRow) {
//             throw new Error(`Data row not found in the table.`);
//         }

//         // Update the row with the new refreshToken, datasetid, collectionid, and accountId
//         const rowValues = {
//             refreshToken: refreshToken,  
//         };

//         // Update the draft row with new values
//         await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableId, existingRow.id, { values: rowValues });
//         console.log(`Data row updated in the table with new refresh token.`);

//         // Publish the table after updating the row
//         await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
//         console.log('Table marq_account_data published after updating the row.');

//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 message: `Data row refresh token updated successfully in HubDB.`,
//             }),
//         };
//     } catch (error) {
//         console.error("Error updating HubDB table:", error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: 'Failed to update HubDB table with new data' }),
//         };
//     }
// };








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

