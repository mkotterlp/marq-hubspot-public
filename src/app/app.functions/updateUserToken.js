const { makeApiCall } = require('./apiAuth'); // Import makeApiCall function
require('dotenv').config();


// const clientId = 'wfcWQOnE4lEpKqjjML2IEHsxUqClm6JCij6QEXGa';
// const clientSecret = 'YiO9bZG7k1SY-TImMZQUsEmR8mISUdww2a1nBuAIWDC3PQIOgQ9Q44xM16x2tGd_cAQGtrtGx4e7sKJ0NFVX';
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;


async function getTemplates(refreshToken) {
    const baseUrl = "https://marqembed.fastgenapp.com/get-templates3";
    const params = new URLSearchParams({
        refresh_token: refreshToken,
        clientid: clientId,
        clientsecret: clientSecret
    });
    const endpoint = `${baseUrl}?${params.toString()}`;

    try {
        const response = await makeApiCall('defaultUserId', 'GET', endpoint);
        console.log("HTTP status code:", response.status);
        console.log("HTTP response body:", response.data);

        if (response.status === 200 && response.data.success) {
            const templatesJsonUrl = response.data.templatesjsonurl;
            const newRefreshToken = response.data.newRefreshToken;
            return { templatesJsonUrl, newRefreshToken };
        } else {
            console.error("Failed to fetch templates:", response.data);
            return null;
        }
    } catch (error) {
        console.error("Error fetching templates:", error);
        return null;
    }
}

async function updateHubDbTable(userId, newRefreshToken, templatesJsonUrl) {
    // Fetch all tables
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

    // Fetch rows from user_data table
    const rowsUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows`;
    const rowsResponse = await makeApiCall(userId, 'GET', rowsUrl);

    if (!rowsResponse || !rowsResponse.results) {
        throw new Error('Failed to fetch rows from the table');
    }

    // Check if the user already exists
    let existingUserRow = rowsResponse.results.find(row => row.values.userId === userId);
    if (!existingUserRow) {
        throw new Error(`User ${userID} not found in the table.`);
    }

    // Update the user's row with new values
    const rowValues = {
        refreshToken: newRefreshToken,
        templatesfeed: templatesJsonUrl
    };

    const updateRowUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/rows/${existingUserRow.id}/draft`;
    await makeApiCall(userId, 'PATCH', updateRowUrl, { values: rowValues });
    console.log(`User ${userId} updated in the table with new refresh token and templates URL.`);

    const publishTableUrl = `https://api.hubapi.com/cms/v3/hubdb/tables/${tableId}/draft/publish`;
    await makeApiCall(userId, 'POST', publishTableUrl);
    console.log('Table user_data published after updating the row.');
}

exports.main = async (context) => {
    const userId = context.parameters?.userId || 'defaultUserId'; // User ID for token management
    const refreshToken = context.parameters?.refreshToken;

    if (!userId || !refreshToken) {
        console.error("Error: Missing required parameters.");
        return { statusCode: 400, body: JSON.stringify({ error: 'userID and refreshToken are required but were not provided' }) };
    }

    const templatesData = await getTemplates(refreshToken);

    if (!templatesData) {
        console.error("Error: Unable to fetch templates data");
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch templates data' }) };
    }

    try {
        await updateHubDbTable(userId, templatesData.newRefreshToken, templatesData.templatesJsonUrl);
    } catch (error) {
        console.error("Error updating HubDB table:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update HubDB table with new data' }) };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            templates_url: templatesData.templatesJsonUrl,
            new_refresh_token: templatesData.newRefreshToken
        })
    };
};
