const { makeApiCall } = require('./apiAuth'); // Import the makeApiCall function

exports.main = async (context) => {

    try {
        const userId = context.parameters?.userID || 'defaultUserId'; // User ID for API token management

        const marqUserID = context.parameters?.marqUserID || "";
        const templatesfeed = context.parameters?.templatesfeed || "";
        const refreshToken = context.parameters?.refreshToken || "";
        const lastTemplateSyncDate = null;

        if (!userID) {
            throw new Error('UserID parameter is missing.');
        }

        console.log(`UserID being queried: ${userID}`);

        // Fetch all tables
        const tablesUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
        const tablesResponse = await makeApiCall(userId, 'GET', tablesUrl);

        if (!tablesResponse || !tablesResponse.results) {
            throw new Error('Failed to fetch tables');
        }

        let userTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'user_data');
        let tableId;

        if (!userTable) {
            console.log('Table user_data not found. Creating the table.');

            const createTableUrl = 'https://api.hubapi.com/cms/v3/hubdb/tables';
            const newTableRequest = {
                name: 'user_data',
                label: 'Marq User Data',
                columns: [
                    { name: 'userID', label: 'User ID', type: 'TEXT' },
                    { name: 'marqUserID', label: 'Marq User ID', type: 'TEXT' },
                    { name: 'templatesfeed', label: 'Templates Feed', type: 'TEXT' },
                    { name: 'refreshToken', label: 'Refresh Token', type: 'TEXT' },
                    { name: 'lastTemplateSyncDate', label: 'Last Template Sync Date', type: 'DATETIME' }
                ],
                useForPages: false
            };
            const newTable = await makeApiCall(userId, 'POST', createTableUrl, newTableRequest);
            tableId = newTable.id;
            console.log(`Table user_data created with ID: ${tableId}`);
        } else {
            tableId = userTable.id;
            console.log('Table user_data found with ID:', tableId);
        }

        // Fetch rows from the user_data table
        const rowsUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
        const rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);
        const existingUserRow = rowsResponse.results.find(row => String(row.values.userID) === String(userID));

        if (existingUserRow) {
            console.log(`User ${userID} found. Returning existing row data.`);

            // Publish the table
            const publishUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
            await makeApiCall(userId, 'POST', publishUrl);

            // Return the existing row data without updating it
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, row: { id: existingUserRow.id, values: existingUserRow.values } })
            };
        } else {
            console.log(`User ${userID} not found. Creating a new row.`);

            const createRowUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
            const rowValues = {
                userID,
                marqUserID,
                templatesfeed,
                refreshToken,
                lastTemplateSyncDate,
            };

            const newRow = await makeApiCall(userId, 'POST', createRowUrl, { values: rowValues });
            console.log(`User ${userID} added to the table.`);

            // Publish the table after making changes (new row added)
            const publishUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
            await makeApiCall(userId, 'POST', publishUrl);

            console.log(`Returning new row data for User ${userID}`);

            // Return the newly created row data
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, row: { id: newRow.id, values: rowValues } })
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while processing your request.', details: error.message })
        };
    }
};
