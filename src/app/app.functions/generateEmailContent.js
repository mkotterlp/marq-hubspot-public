exports.main = async (context) => {
  const project = context.parameters?.project;

  if (!project) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing required parameter: project" }),
    };
  }

  try {
    const emailContent = `
      Hi there,

      Here are the details for the project ${project.name}:
      ${project.fileurl}

      Regards,
      Team
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ emailContent }),
    };
  } catch (error) {
    console.error("Error generating email content:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to generate email content", error: error.message }),
    };
  }
};



















// const hubspot = require('@hubspot/api-client');

// exports.main = async (context) => {
//   const hubspotClient = new hubspot.Client({
//     accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
//   });

//   const project = context.parameters?.project;

//   if (!project) {
//     return {
//       statusCode: 400,
//       body: JSON.stringify({ message: "Missing required parameter: project" })
//     };
//   }

//   try {
//     const emailContent = `
//       Hi there,

//       Here are the details for the project ${project.name}:
//       ${project.fileurl}

//       Regards,
//       Team
//     `;

//     return {
//       statusCode: 200,
//       body: JSON.stringify({ emailContent })
//     };
//   } catch (error) {
//     console.error("Error generating email content:", error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: "Failed to generate email content", error: error.message })
//     };
//   }
// };
