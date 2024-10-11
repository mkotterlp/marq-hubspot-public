const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // Get the userId for token management
    let tableId;

    try {
        // Fetch all tables
        const tablesUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
        const tablesResponse = await makeApiCall(userId, 'GET', tablesUrl);

        if (!tablesResponse || !tablesResponse.results) {
            throw new Error('Failed to fetch tables');
        }

        let marqembedTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marqembed2');

        if (!marqembedTable) {
            console.log('Table marqembed2 not found, creating new table');
            const createTableUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
            const tableCreationRequest = {
                name: 'marqembed2',
                label: 'Marq Embed',
                columns: [
                    { name: 'objectType', label: 'Object Type', type: 'TEXT' },
                    { name: 'textboxFields', label: 'Textbox Fields', type: 'TEXT' },
                    { name: 'textboxFilters', label: 'Textbox Filters', type: 'TEXT' },
                    { name: 'dataFields', label: 'Data Fields', type: 'TEXT' },
                    {
                        name: 'enabledFeatures', label: 'Enabled Features', type: 'MULTISELECT', options: [
                            { name: 'lock', label: 'Enable Lock', type: 'option' },
                            { name: 'download', label: 'Enable Download', type: 'option' },
                            { name: 'print', label: 'Enable Print', type: 'option' },
                            { name: 'collaborate', label: 'Enable Collaborate', type: 'option' },
                            { name: 'share', label: 'Enable Share', type: 'option' },
                            { name: 'saveName', label: 'Enable Save Name', type: 'option' },
                            { name: 'backButton', label: 'Enable Back Button', type: 'option' }
                        ]
                    },
                    {
                        name: 'fileTypes', label: 'File Types', type: 'MULTISELECT', options: [
                            { name: 'pdf', label: 'Allow PDF', type: 'option' },
                            { name: 'jpg', label: 'Allow JPG', type: 'option' },
                            { name: 'png', label: 'Allow PNG', type: 'option' },
                            { name: 'gif', label: 'Allow GIF', type: 'option' },
                            { name: 'mp4', label: 'Allow MP4', type: 'option' }
                        ]
                    },
                    {
                        name: 'showTabs', label: 'Show Tabs', type: 'MULTISELECT', options: [
                            { name: 'dashboard', label: 'Show Dashboard', type: 'option' },
                            { name: 'documents', label: 'Show Documents', type: 'option' },
                            { name: 'templates', label: 'Show Templates', type: 'option' }
                        ]
                    }
                ],
            };
            const tableCreationResponse = await makeApiCall(userId, 'POST', createTableUrl, tableCreationRequest);
            tableId = tableCreationResponse.id;
            marqembedTable = tableCreationResponse;

            console.log('Table marqembed2 created and published');
        } else {
            tableId = marqembedTable.id;
            console.log('Table marqembed2 found with ID:', tableId);
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

        const allObjectTypes = [...standardObjectTypes.map(type => type.toLowerCase()), ...customObjectTypes];

        let existingObjectTypes = rowsResponse.results.map(row => row.values.objectType.toLowerCase());

        for (const objectType of allObjectTypes) {
            if (!existingObjectTypes.includes(objectType.toLowerCase())) {
                console.log(`Creating new row for object type: ${objectType}`);
                const createRowUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
                const rowValues = {
                    objectType: objectType,
                    textboxFields: "",
                    textboxFilters: "",
                    dataFields: "",
                    enabledFeatures: [
                        { name: "share", type: "option" },
                        { name: "saveName", type: "option" }
                    ],
                    fileTypes: [
                        { name: "pdf", type: "option" }
                    ],
                    showTabs: [
                        { name: "templates", type: "option" }
                    ]
                };
                await makeApiCall(userId, 'POST', createRowUrl, { values: rowValues });
            }
        }

        const publishUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
        await makeApiCall(userId, 'POST', publishUrl);
        console.log('Table marqembed2 published after creating new rows.');

        // Re-fetch rows after publishing to ensure newly added rows are included
        rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);
        if (!rowsResponse || !rowsResponse.results) {
            throw new Error('Failed to fetch rows from the table after publishing');
        }

        // Assuming context.parameters contains necessary keys for filtering config
        const objectType = context.parameters?.objectType?.toLowerCase() || 'default'; // Default object type if not provided
        let relevantRow = rowsResponse.results.find(row => row.values.objectType.toLowerCase() === objectType);

        if (!relevantRow) {
            throw new Error(`No configuration found for object type: ${objectType}`);
        }

        return {
            body: JSON.stringify(relevantRow),
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

//         let marqembedTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'marqembed2');

//         if (!marqembedTable) {
//             console.log('Table marqembed2 not found, creating new table');
//             const tableCreationResponse = await hubspotClient.cms.hubdb.tablesApi.createTable({
//                 name: 'marqembed2',
//                 label: 'Marq Embed',
//                 columns: [
//                     { name: 'objectType', label: 'Object Type', type: 'TEXT' },
//                     { name: 'textboxFields', label: 'Textbox Fields', type: 'TEXT' },
//                     { name: 'textboxFilters', label: 'Textbox Filters', type: 'TEXT' },
//                     { name: 'dataFields', label: 'Data Fields', type: 'TEXT' },
//                     { name: 'enabledFeatures', label: 'Enabled Features', type: 'MULTISELECT', options: [
//                         { name: 'lock', label: 'Enable Lock', type: 'option' },
//                         { name: 'download', label: 'Enable Download', type: 'option' },
//                         { name: 'print', label: 'Enable Print', type: 'option' },
//                         { name: 'collaborate', label: 'Enable Collaborate', type: 'option' },
//                         { name: 'share', label: 'Enable Share', type: 'option' },
//                         { name: 'saveName', label: 'Enable Save Name', type: 'option' },
//                         { name: 'backButton', label: 'Enable Back Button', type: 'option' }
//                     ]},
//                     { name: 'fileTypes', label: 'File Types', type: 'MULTISELECT', options: [
//                         { name: 'pdf', label: 'Allow PDF', type: 'option' },
//                         { name: 'jpg', label: 'Allow JPG', type: 'option' },
//                         { name: 'png', label: 'Allow PNG', type: 'option' },
//                         { name: 'gif', label: 'Allow GIF', type: 'option' },
//                         { name: 'mp4', label: 'Allow MP4', type: 'option' }
//                     ]},
//                     { name: 'showTabs', label: 'Show Tabs', type: 'MULTISELECT', options: [
//                         { name: 'dashboard', label: 'Show Dashboard', type: 'option' },
//                         { name: 'documents', label: 'Show Documents', type: 'option' },
//                         { name: 'templates', label: 'Show Templates', type: 'option' }
//                     ]}
//                 ],
//             });
//             tableId = tableCreationResponse.id;
//             marqembedTable = tableCreationResponse;

//             console.log('Table marqembed2 created and published');
//         } else {
//             tableId = marqembedTable.id;
//             console.log('Table marqembed2 found with ID:', tableId);
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

//         const allObjectTypes = [...standardObjectTypes.map(type => type.toLowerCase()), ...customObjectTypes];

//         let existingObjectTypes = rowsResponse.results.map(row => row.values.objectType.toLowerCase());

//         for (const objectType of allObjectTypes) {
//             if (!existingObjectTypes.includes(objectType.toLowerCase())) {
//                 console.log(`Creating new row for object type: ${objectType}`);
//                 const rowValues = {
//                     objectType: objectType,
//                     textboxFields: "", 
//                     textboxFilters: "", 
//                     dataFields: "", 
//                     enabledFeatures: [
//                         { name: "share", type: "option" },
//                         { name: "saveName", type: "option" }
//                     ],
//                     fileTypes: [
//                         { name: "pdf", type: "option" }
//                     ],
//                     showTabs: [
//                         { name: "templates", type: "option" }
//                     ]
//                 };
//                 await hubspotClient.cms.hubdb.rowsApi.createTableRow(tableId, { values: rowValues });
//             }
//         }

//         await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
//         console.log('Table marqembed2 published after creating new rows.');

//         // Re-fetch rows after publishing to ensure newly added rows are included
//         rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
//         if (!rowsResponse || !rowsResponse.results) {
//             throw new Error('Failed to fetch rows from the table after publishing');
//         }

//         // Assuming context.parameters contains necessary keys for filtering config
//         const objectType = context.parameters?.objectType?.toLowerCase() || 'default'; // Default object type if not provided
//         let relevantRow = rowsResponse.results.find(row => row.values.objectType.toLowerCase() === objectType);

//         if (!relevantRow) {
//             throw new Error(`No configuration found for object type: ${objectType}`);
//         }

//         return {
//             body: JSON.stringify(relevantRow),
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
