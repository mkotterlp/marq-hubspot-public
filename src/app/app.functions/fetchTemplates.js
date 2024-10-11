const axios = require('axios');
require('dotenv').config();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
// const clientId = 'wfcWQOnE4lEpKqjjML2IEHsxUqClm6JCij6QEXGa';
// const clientSecret = 'YiO9bZG7k1SY-TImMZQUsEmR8mISUdww2a1nBuAIWDC3PQIOgQ9Q44xM16x2tGd_cAQGtrtGx4e7sKJ0NFVX';

async function getTemplates(refreshToken, marquserid) {
    const baseUrl = "https://marqembed.fastgenapp.com/get-templates3";
    const params = new URLSearchParams({
        refresh_token: refreshToken,
        marquserid: marquserid,
        clientid: clientId,
        clientsecret: clientSecret
    });
    const endpoint = `${baseUrl}?${params.toString()}`;

    try {
        const response = await axios.get(endpoint);
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

// async function updateHubDbTable(hubspotClient, userID, newRefreshToken, templatesJsonUrl) {
//     // Fetch all tables
//     const tablesResponse = await hubspotClient.cms.hubdb.tablesApi.getAllTables();
//     if (!tablesResponse || !tablesResponse.results) {
//         throw new Error('Failed to fetch tables');
//     }

//     let userTable = tablesResponse.results.find(table => table.name.toLowerCase() === 'user_data');
//     if (!userTable) {
//         throw new Error('Table user_data not found.');
//     }

//     const tableId = userTable.id;
//     console.log('Table user_data found with ID:', tableId);

//     console.log('Fetching rows from user_data table');
//     const rowsResponse = await hubspotClient.cms.hubdb.rowsApi.getTableRows(tableId);
//     if (!rowsResponse || !rowsResponse.results) {
//         throw new Error('Failed to fetch rows from the table');
//     }

//     // Check if the user already exists
//     let existingUserRow = rowsResponse.results.find(row => row.values.userID === userID);
//     if (!existingUserRow) {
//         throw new Error(`User ${userID} not found in the table.`);
//     }

//     // Update the user's row with the new values
//     const rowValues = {
//         refreshToken: newRefreshToken,
//         templatesfeed: templatesJsonUrl,
//         lastTemplateSyncDate: new Date().toISOString()
//     };

//     await hubspotClient.cms.hubdb.rowsApi.updateDraftTableRow(tableId, existingUserRow.id, { values: rowValues });
//     console.log(`User ${userID} updated in the table with new refresh token and templates URL.`);

//     await hubspotClient.cms.hubdb.tablesApi.publishDraftTable(tableId);
//     console.log('Table user_data published after updating the row.');
// }

exports.main = async (context) => {
    const hubspotClient = new hubspot.Client({
        accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
    });

    const userID = String(context.parameters?.userID);
    const refreshToken = context.parameters?.refreshToken;
    const marquserid = context.parameters?.marquserid;

    if (!userID || !refreshToken || !marquserid) {
        console.error("Error: Missing required parameters.");
        return { statusCode: 400, body: JSON.stringify({ error: 'userID and refreshToken are required but were not provided' }) };
    }

    const templatesData = await getTemplates(refreshToken, marquserid);

    if (!templatesData) {
        console.error("Error: Unable to fetch templates data");
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch templates data' }) };
    }

    // try {
    //     await updateHubDbTable(hubspotClient, userID, templatesData.newRefreshToken, templatesData.templatesJsonUrl);
    // } catch (error) {
    //     console.error("Error updating HubDB table:", error);
    //     return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update HubDB table with new data' }) };
    // }

    return {
        statusCode: 200,
        body: JSON.stringify({
            templatesjsonurl: templatesData.templatesJsonUrl,
            newRefreshToken: templatesData.newRefreshToken
        })
    };
};