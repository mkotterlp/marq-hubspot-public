const axios = require('axios');

exports.main = async (context) => {
  try {
    // Fetch the JSON data from the external URL
    const response = await axios.get('https://marqsocial.web.app/jsons/d0e7799a-f509-45d8-a58b-0fe4578dc6fc.json');
    const data = response.data;

    // Return the fetched data in the expected format
    return {
      statusCode: 200,
      body: JSON.stringify({ templatesresponse: data.templatesresponse })
    };

  } catch (error) {
    console.error("Error fetching JSON data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch JSON data", error: error.message })
    };
  }
};
