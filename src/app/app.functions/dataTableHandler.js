const { makeApiCall } = require('./apiAuth'); // Import the global makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId';
    let tableId;

    try {
        // Fetch all tables
        const tablesUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
        const tablesResponse = await makeApiCall(userId, 'GET', tablesUrl);
        if (!tablesResponse || !tablesResponse.results) {
            throw new Error('Failed to fetch tables');
        }

        let marqembedTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');

        if (!marqembedTable) {
            console.log('Table marq_account_data not found, creating new table');
            const createTableUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
            const tableCreationResponse = await makeApiCall(userId, 'POST', createTableUrl, {
                name: 'marq_account_data',
                label: 'Marq Account Data',
                columns: [
                    { name: 'objectType', label: 'Object Type', type: 'TEXT' },
                    { name: 'accountId', label: 'Account ID', type: 'TEXT' },
                    { name: 'refreshToken', label: 'Refresh token', type: 'TEXT' },
                    { name: 'datasetid', label: 'Data set ID', type: 'TEXT' },
                    { name: 'collectionid', label: 'Collection ID', type: 'TEXT' },
                ],
            });
            tableId = tableCreationResponse.id;
            marqembedTable = tableCreationResponse;
            console.log('Table account created and published');
        } else {
            tableId = marqembedTable.id;
            console.log('Table account found with ID:', tableId);
        }

        console.log('Fetching rows from table');
        const rowsUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
        let rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);
        if (!rowsResponse || !rowsResponse.results) {
            throw new Error('Failed to fetch rows from the table');
        }

        // Fetching all CRM object types
        const objectTypesUrl = 'https://api.hubapi.com/crm/v3/schemas';
        const objectTypesResponse = await makeApiCall(userId, 'GET', objectTypesUrl);
        if (!objectTypesResponse || !objectTypesResponse.results) {
            throw new Error('Failed to fetch CRM object types');
        }

        const customObjectTypes = objectTypesResponse.results.map(obj => obj.name.toLowerCase());

        // Including standard object types
        const standardObjectTypes = ['contact', 'company', 'deal', 'ticket'];

        const allObjectTypes = [...standardObjectTypes, ...customObjectTypes];

        let existingObjectTypes = rowsResponse.results
            .filter(row => row.values.objectType) // Filter out rows without objectType
            .map(row => row.values.objectType.toLowerCase());

        // Iterate over all object types and either update or create new rows
        for (const objectType of allObjectTypes) {
            let existingRow = rowsResponse.results.find(row => row.values.objectType.toLowerCase() === objectType.toLowerCase());

            if (existingRow) {
                console.log(`Updating existing row for object type: ${objectType}`);
                
                // Only update fields if they are empty or missing
                const updatedValues = {
                    accountId: existingRow.values.accountId || "",  // Keep existing value if not empty
                    refreshToken: existingRow.values.refreshToken || "",  // Keep existing value if not empty
                    datasetid: existingRow.values.datasetid || "",  // Keep existing value if not empty
                    collectionid: existingRow.values.collectionid || ""  // Keep existing value if not empty
                };

                // Update the row if necessary
                const updateRowUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows/${existingRow.id}`;
                await makeApiCall(userId, 'PATCH', updateRowUrl, { values: updatedValues });
            } else {
                console.log(`Creating new row for object type: ${objectType}`);
                const rowValues = {
                    objectType: objectType,
                    accountId: "", 
                    refreshToken: "", 
                    datasetid: "", 
                    collectionid: "", 
                };
                await makeApiCall(userId, 'POST', rowsUrl, { values: rowValues });
            }
        }

        const publishTableUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
        await makeApiCall(userId, 'POST', publishTableUrl);
        console.log('Table marq_account_data published after creating or updating rows.');

        // Re-fetch rows after publishing to ensure newly added/updated rows are included
        rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);
        if (!rowsResponse || !rowsResponse.results) {
            throw new Error('Failed to fetch rows from the table after publishing');
        }

        // Filter the matched row based on provided objectType
        const objectType = context.parameters?.objectType?.toLowerCase() || 'default'; // Default object type if not provided
        let matchedRow = rowsResponse.results.find(row => row.values.objectType && row.values.objectType.toLowerCase() === objectType);
        let dataRow = rowsResponse.results.find(row => row.values.objectType && row.values.objectType.toLowerCase() === 'data');

        if (!matchedRow && !dataRow) {
            throw new Error(`No configuration found for object type: ${objectType} or 'data'`);
        }

        return {
            body: JSON.stringify({
                objectTypeRow: matchedRow || null,
                dataRow: dataRow || null
            }),
            statusCode: 200,
        };

    } catch (error) {
        console.error('Error:', {
            message: error.message,
            statusCode: error.statusCode,
            body: error.body,
            stack: error.stack,
        });
        return {
            body: JSON.stringify({ error: 'An error occurred while processing your request.', details: error.message }),
            statusCode: 500,
        };
    }
};



















// const hubspot = require('@hubspot/api-client');

// exports.main = async (context) => {
//     const hubspotClient = new hubspot.Client({
//         accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
//     });

//     let tableId;

//     try {
//         // Fetch all tables
//         const tablesResponse = await hubspotClient.cms.hubdb.tablesApi.getAllTables();
//         if (!tablesResponse || !tablesResponse.results) {
//             throw new Error('Failed to fetch tables');
//         }

//         let marqembedTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marq_account_data');

//         if (!marqembedTable) {
//             console.log('Table marq_account_data not found, creating new table');
//             const tableCreationResponse = await hubspotClient.cms.hubdb.tablesApi.createTable({
//                 name: 'marq_account_data',
//                 label: 'Marq Account Data',
//                 columns: [
//                     { name: 'objectType', label: 'Object Type', type: 'TEXT' },
//                     { name: 'accountId', label: 'Account ID', type: 'TEXT' },
//                     { name: 'refreshToken', label: 'Refresh token', type: 'TEXT' },
//                     { name: 'datasetid', label: 'Data set ID', type: 'TEXT' },
//                     { name: 'collectionid', label: 'Collection ID', type: 'TEXT' },
//                 ],
//             });
//             tableId = tableCreationResponse.id;
//             marqembedTable = tableCreationResponse;

//             console.log('Table account created and published');
//         } else {
//             tableId = marqembedTable.id;
//             console.log('Table account found with ID:', tableId);
//         }

//         console.log('Fetching rows from table');
//         let rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
//         if (!rowsResponse || !rowsResponse.results) {
//             throw new Error('Failed to fetch rows from the table');
//         }

//         // Fetching all CRM object types
//         const objectTypesResponse = await hubspotClient.crm.schemas.coreApi.getAll();
//         if (!objectTypesResponse || !objectTypesResponse.results) {
//             throw new Error('Failed to fetch CRM object types');
//         }
//         const customObjectTypes = objectTypesResponse.results.map(obj => obj.name.toLowerCase());

//         // Including standard object types
//         const standardObjectTypes = ['contact', 'company', 'deal', 'ticket'];

//         const allObjectTypes = [...standardObjectTypes, ...customObjectTypes];

//         let existingObjectTypes = rowsResponse.results
//             .filter(row => row.values.objectType) // Filter out rows without objectType
//             .map(row => row.values.objectType.toLowerCase());

//         // Iterate over all object types and either update or create new rows
//         for (const objectType of allObjectTypes) {
//             let existingRow = rowsResponse.results.find(row => row.values.objectType.toLowerCase() === objectType.toLowerCase());

//             if (existingRow) {
//                 console.log(`Updating existing row for object type: ${objectType}`);
                
//                 // Only update fields if they are empty or missing
//                 const updatedValues = {
//                     accountId: existingRow.values.accountId || "",  // Keep existing value if not empty
//                     refreshToken: existingRow.values.refreshToken || "",  // Keep existing value if not empty
//                     datasetid: existingRow.values.datasetid || "",  // Keep existing value if not empty
//                     collectionid: existingRow.values.collectionid || ""  // Keep existing value if not empty
//                 };

//                 // Update the row if necessary
//                 await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableId, existingRow.id, {
//                     values: updatedValues
//                 });
//             } else {
//                 console.log(`Creating new row for object type: ${objectType}`);
//                 const rowValues = {
//                     objectType: objectType,
//                     accountId: "", 
//                     refreshToken: "", 
//                     datasetid: "", 
//                     collectionid: "", 
//                 };
//                 await hubspotClient.cms.hubdb.rowsApi.createTableRow(tableId, { values: rowValues });
//             }
//         }

//         await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
//         console.log('Table marq_account_data published after creating or updating rows.');

//         // Re-fetch rows after publishing to ensure newly added/updated rows are included
//         rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
//         if (!rowsResponse || !rowsResponse.results) {
//             throw new Error('Failed to fetch rows from the table after publishing');
//         }

//         // Filter the matched row based on provided objectType
//         const objectType = context.parameters?.objectType?.toLowerCase() || 'default'; // Default object type if not provided
//         let matchedRow = rowsResponse.results.find(row => row.values.objectType && row.values.objectType.toLowerCase() === objectType);
//         let dataRow = rowsResponse.results.find(row => row.values.objectType && row.values.objectType.toLowerCase() === 'data');

//         if (!matchedRow && !dataRow) {
//             throw new Error(`No configuration found for object type: ${objectType} or 'data'`);
//         }

//         return {
//             body: JSON.stringify({
//                 objectTypeRow: matchedRow || null,
//                 dataRow: dataRow || null
//             }),
//             statusCode: 200,
//         };

//     } catch (error) {
//         console.error('Error:', {
//             message: error.message,
//             statusCode: error.statusCode,
//             body: error.body,
//             stack: error.stack,
//         });
//         return {
//             body: JSON.stringify({ error: 'An error occurred while processing your request.', details: error.message }),
//             statusCode: 500,
//         };
//     }
// };
