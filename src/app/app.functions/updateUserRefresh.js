const { makeApiCall } = require('./apiAuth'); // Import makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // User ID for token management
    const marqUserID = String(context.parameters?.marquserId);
    const refreshToken = context.parameters?.newrefreshtoken;

    console.log("refreshToken", refreshToken);

    // Check if all required parameters are provided
    if (!marqUserID) {
        console.error("Error: Missing marqUserID.");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'marqUserID is required but was not provided' }),
        };
    }

    try {
        // Fetch all tables to find the user_data table
        const tablesUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
        const tablesResponse = await makeApiCall(userId, 'GET', tablesUrl);

        if (!tablesResponse || !tablesResponse.results) {
            throw new Error('Failed to fetch tables');
        }

        let userTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'user_data');
        if (!userTable) {
            throw new Error('Table user_data not found.');
        }

        const tableId = userTable.id;
        console.log('Table user_data found with ID:', tableId);

        // Fetch all rows from the user_data table
        const rowsUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
        const rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);

        if (!rowsResponse || !rowsResponse.results) {
            throw new Error('Failed to fetch rows from the table');
        }

        let existingUserRow = rowsResponse.results.find(row => row.values.marqUserID === marqUserID);
        if (!existingUserRow) {
            throw new Error(`marqUserID ${marqUserID} not found in the table.`);
        }

        const rowValues = {
            refreshToken: refreshToken,
        };

        // Update the row with new refresh token
        const updateRowUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows/${existingUserRow.id}/draft`;
        await makeApiCall(userId, 'PATCH', updateRowUrl, { values: rowValues });
        console.log(`marqUserID ${marqUserID} updated in the table with new refresh token.`);

        // Publish the updated table
        const publishTableUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
        await makeApiCall(userId, 'POST', publishTableUrl);
        console.log('Table user_data published after updating the row.');

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `marqUserID ${marqUserID} updated successfully in HubDB.`,
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
//     const marqUserID = String(context.parameters?.marquserId);
//     // const refreshToken = context.parameters?.refreshToken; newrefreshtoken
//     const refreshToken = context.parameters?.newrefreshtoken; 

//     console.log("refreshToken", refreshToken);


//     // Check if all required parameters are provided
//     if (!marqUserID) {
//         console.error("Error: Missing marqUserID.");
//         return {
//             statusCode: 400,
//             body: JSON.stringify({ error: 'marqUserID, refreshToken, and templatesJsonUrl are required but were not provided' }),
//         };
//     }

//     try {
//         const hubspotClient = new hubspot.Client({
//             accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
//         });

//         const tablesResponse = await hubspotClient.cms.hubdb.tablesApi.getAllTables();
//         if (!tablesResponse || !tablesResponse.results) {
//             throw new Error('Failed to fetch tables');
//         }

//         let userTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'user_data');
//         if (!userTable) {
//             throw new Error('Table user_data not found.');
//         }

//         const tableId = userTable.id;
//         console.log('Table user_data found with ID:', tableId);

//         const rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
//         if (!rowsResponse || !rowsResponse.results) {
//             throw new Error('Failed to fetch rows from the table');
//         }

//         let existingUserRow = rowsResponse.results.find(row => row.values.marqUserID === marqUserID);
//         if (!existingUserRow) {
//             throw new Error(`marqUserID ${marqUserID} not found in the table.`);
//         }

//         const rowValues = {
//             refreshToken: refreshToken,
//         };


//         await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableId, existingUserRow.id, { values: rowValues });
//         console.log(`marqUserID ${marqUserID} updated in the table with new refresh token and templates URL.`);

//         await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
//         console.log('Table user_data published after updating the row.');

//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 message: `marqUserID ${marqUserID} updated successfully in HubDB.`,
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
