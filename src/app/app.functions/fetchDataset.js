const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {
    // Read the parameters from the request
    const userId = context.parameters?.userId || 'defaultUserId'; // Get the userId for token management
    const objectType = context.parameters?.objectType; // Use objectType

    console.log("objectType:", objectType);

    // Check if the objectType parameter is provided
    if (!objectType) {
        console.error("Error: Missing required parameter objectType.");
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required parameter objectType" }),
        };
    }

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
        let existingRow = rowsResponse.results.find(row => row.values.objectType === objectType);
        if (!existingRow) {
            console.log(`ObjectType ${objectType} not found in the table.`);
            return {
                statusCode: 404,
                body: JSON.stringify({ message: `ObjectType ${objectType} not found in the table.` }),
            };
        }

        // Return the dataset and collection information
        return {
            statusCode: 200,
            body: JSON.stringify({
                datasetid: existingRow.values.datasetid,
                collectionid: existingRow.values.collectionid,
            }),
        };
    } catch (error) {
        console.error("Error fetching dataset from HubDB table:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch dataset from HubDB table', details: error.message }),
        };
    }
};



















// const hubspot = require('@hubspot/api-client');

// exports.main = async (context) => {
//     // Read the parameters from the request
//     const objectType = context.parameters?.objectType;  // Use objectType 

//     console.log("objectType:", objectType);

//     // Check if the objectType parameter is provided
//     if (!objectType) {
//         console.error("Error: Missing required parameter objectType.");
//         return {
//             statusCode: 400,
//             body: JSON.stringify({ message: "Missing required parameter objectType" }),
//         };
//     }

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
//         let existingRow = rowsResponse.results.find(row => row.values.objectType === objectType);
//         if (!existingRow) {
//             console.log(`ObjectType ${objectType} not found in the table.`);
//             return {
//                 statusCode: 404,
//                 body: JSON.stringify({ message: `ObjectType ${objectType} not found in the table.` })
//             };
//         }

//         // Return the dataset and collection information
//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 datasetid: existingRow.values.datasetid,
//                 collectionid: existingRow.values.collectionid,
//             }),
//         };
//     } catch (error) {
//         console.error("Error fetching dataset from HubDB table:", error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: 'Failed to fetch dataset from HubDB table' }),
//         };
//     }
// };
