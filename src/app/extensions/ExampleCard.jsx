import { useState, useEffect, useCallback, useRef } from "react"; 
import {
  LoadingButton,
  Flex,
  Box,
  Image,
  Input,
  Link,
  Button,
  ButtonRow,
  Table,
  Form,
  TableCell,
  TableBody,
  TableRow,
  Text,
  Divider,
  LoadingSpinner,
  hubspot,
} from "@hubspot/ui-extensions";
import {
  CrmActionButton
} from "@hubspot/ui-extensions/crm";

hubspot.extend((extensionContext) => {
  return (
    <Extension 
      context={extensionContext.context} 
      actions={extensionContext.actions}
    />
  );
});

const Extension = ({ context, actions }) => {
  const [iframeUrl, setIframeUrl] = useState("");
  const [marquserid, setMarquserid] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [isAccountPolling, setAccountIsPolling] = useState(false);
  const [isAccountTokenClicked, setIsAccountTokenClicked] = useState(false);
  const [isRefreshTokenClicked, setIsRefreshTokenClicked] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);
  const [isConnectToMarq, setIsConnectToMarq] = useState(false); // New state to track connection flow
  const [isConnectedToMarq, setIsConnectedToMarq] = useState(false); // Set to true when user connects to Marq
  const [showAccountTokenButton, setShowAccountTokenButton] = useState(false);
  const [accountoauthUrl, setAccountAuthorizationUrl] = useState("");
  const [loadingaccounttoken, setloadingaccountrefreshtoken] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [apiKey, setAPIkey] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [authurl, setauth] = useState(""); //setauthConnectToMarq
  const [authurlConnectToMarq, setauthConnectToMarq] = useState(""); //setauthConnectToMarq
  const [authurlAccountToken, setauthAccountToken] = useState(""); //setauthAccountToken
  const [templates, setTemplates] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);
  const [fulltemplatelist, setfullTemplates] = useState([]);
  const [dynamicProperties, setDynamicProperties] = useState({});
  const [lineitemProperties, setLineitemProperties] = useState({});
  const [isIframeOpen, setIframeOpen] = useState(false);
  const [title, setTitle] = useState("Relevant Content");

  const [stageName, setStage] = useState("");
  const [propertiesToWatch, setpropertiesToWatch] = useState([]);
  const [objectType, setObjectType] = useState("");
  const [initialFilteredTemplates, setInitialFilteredTemplates] = useState([]);
  const [config, setConfig] = useState({});
  const [fieldsArray, setFieldsArray] = useState([]);
  const [dataArray, setDataArray] = useState([]);
  const [filtersArray, setFiltersArray] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "none",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [lastModifiedDate, setLastModifiedDate] = useState("");
  const hasInitialized = useRef(false);
  const RECORDS_PER_PAGE = 10;
  const [hoveredRow, setHoveredRow] = useState(null);
  const [crmProperties, setCrmProperties] = useState({});
  const [shouldPollForProjects, setShouldPollForProjects] = useState({
    isPolling: false,
    templateId: null,
  });
  const [prevProjectCount, setPrevProjectCount] = useState(0);
  const previousProjectCountRef = useRef(projects.length);
  const pollingTimerRef = useRef(null);
  const hasSyncedOnceRef = useRef(false);

  let paginatedTemplates = [];
  let propertiesBody = {};
  let configData = {};
  let templateLink;
  let currentRefreshToken = "";
  let currentAccountRefreshToken = "";
  let marqAccountId = "";
  let collectionid = "";
  let datasetid = "";
  let lastTemplateSyncDate;
  let accountResponseBody = {};
  let schema = [
    { name: "Id", fieldType: "STRING", isPrimary: true, order: 1 },
    {
      name: "Marq User Restriction",
      fieldType: "STRING",
      isPrimary: false,
      order: 2,
    },
  ];


useEffect(() => {
  if (context) {
    console.log("Context:", context); 
    fetchObjectType(context);  // Call fetchObjectType only when context is available
  } else {
    console.log("Context is not available yet.");
  }
}, [context]);


const fetchObjectType = async (context) => {
  try {
    if (!context) {
      throw new Error("Context is undefined.");
    }

    // Check if CRM data exists in the context
    if (context.crm && context.crm.objectTypeId) {
      const userId = context.user.id;

      const objectTypeResponse = await hubspot.fetch(
        "https://marqembed.fastgenapp.com/fetch-object",
        {
          method: "POST",
          body: {
            objectTypeId: context.crm.objectTypeId,
            userId: userId, 
          },
        }
      );

      if (objectTypeResponse.ok) {
        const objectTypeResponseBody = await objectTypeResponse.json();
        
        // Accessing the objectType within the body -> Data -> body
        const objectType = objectTypeResponseBody.Data?.body?.objectType;

        if (objectType) {
          console.log("Object Type:", objectType);
        } else {
          console.error("Object Type not found in response.");
        }
      } else {
        console.error("Error fetching object type:", objectTypeResponse);
      }
    } else {
      throw new Error("CRM data or objectTypeId is missing in context.");
    }
  } catch (error) {
    console.error("Error fetching object type:", error);
  }
};


  const fetchPropertiesAndLoadConfig = async (objectType) => {
    try {
      setIsLoading(true);

      const userId = context.user.id;

      // Validate that userid is available before proceeding
      if (!userId) {
        console.error("Error: Missing user ID.");
        setIsLoading(false);
        return;
      }

      // Fetch user data from the 'marqouathhandler' serverless function
      try {
        const createusertable = await hubspot.fetch({
          name: "marqouathhandler",
          parameters: { userID: userid },
        });

        if (createusertable?.response?.body) {
          const responseBody = JSON.parse(createusertable.response.body);
          const userData = responseBody.row?.values || {}; // Access values directly from row
          lastTemplateSyncDate = userData.lastTemplateSyncDate;
          templateLink = userData.templatesfeed;
          const marquserid = userData.marqUserID;
          // const marquserid = userData.marqUserID;

          currentRefreshToken = userData.refreshToken;

          // setRefreshToken(currentRefreshToken)
          // Validate required values before proceeding with further operations
          if (!currentRefreshToken || !marquserid) {
            setShowTemplates(false);
            setIsLoading(false);
            return;
          }

          setMarquserid(marquserid);

          const currentTime = Date.now();
          const timeDifference = currentTime - lastTemplateSyncDate;
          const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

          // Fetch templates if template link is missing
          if (
            (timeDifference > twentyFourHoursInMs && currentRefreshToken) ||
            (!templateLink && currentRefreshToken)
          ) {
            try {

              const params = new URLSearchParams({
                refresh_token: refreshToken,
                marquserid: marquserid,
              });
              
              const fetchResult = await hubspot.fetch(
                `https://marqembed.fastgenapp.com/get-templates4?${params.toString()}`,
                {
                  method: "GET"
                }
              );


              // Log the full response object

              if (fetchResult && fetchResult.response) {
                console.log('fetchResult:', fetchResult);
                console.log('fetchResult.response:', fetchResult.response);

                const statusCode = fetchResult.response.statusCode;

                if (statusCode === 200 && fetchResult.response.body) {
                  try {
                    const fetchedData = JSON.parse(fetchResult.response.body);

                    // Check if the required data is present
                    if (
                      fetchedData.templatesjsonurl &&
                      fetchedData.newRefreshToken
                    ) {
                      templateLink = fetchedData.templatesjsonurl;
                      currentRefreshToken = fetchedData.newRefreshToken;
                    } else {
                      console.error(
                        "Error: Missing expected data in response body.",
                        fetchedData
                      );
                      templateLink = "";
                      currentRefreshToken = "";
                    }
                  } catch (jsonError) {
                    console.error(
                      "Error parsing JSON response:",
                      jsonError,
                      fetchResult.response.body
                    );
                    templateLink = "";
                    currentRefreshToken = "";
                  }
                } else {
                  // Handle non-200 status codes
                  console.error(
                    "Failed to fetch new template link. Status Code:",
                    statusCode,
                    "Response body:",
                    fetchResult.response.body
                  );
                  templateLink = "";
                  currentRefreshToken = "";
                }
              } else {
                // Handle missing response
                console.error(
                  "Error: fetchResult or response is undefined or malformed.",
                  fetchResult
                );
                templateLink = "";
                currentRefreshToken = "";
              }

              try {
                // Call the serverless function to update the user table
                const updateResult = await hubspot.fetch({
                  name: "updateUserTable",
                  parameters: {
                    userId: userId,
                    refreshToken: currentRefreshToken,
                    templatesJsonUrl: templateLink,
                  },
                });

                // Parse the response
                if (updateResult.statusCode === 200) {
                  setResponseMessage(
                    "User data and refresh token updated successfully!"
                  );
                } else if (updateResult.statusCode === 400) {
                  console.error(
                    "Invalid request parameters:",
                    updateResult.body
                  );
                  setResponseMessage(
                    "Invalid request. Please check the input parameters."
                  );
                } else if (updateResult.statusCode === 500) {
                  console.error("Internal server error:", updateResult.body);
                  setResponseMessage(
                    "Server error while updating user data. Please try again later."
                  );
                } else {
                  console.error("Unexpected response:", updateResult);
                  setResponseMessage(
                    "An unexpected error occurred. Please try again later."
                  );
                }
              } catch (updateError) {
                console.error(
                  "Error occurred while trying to update user table:",
                  updateError
                );
                setResponseMessage(
                  "A network or server error occurred. Please try again later."
                );
              } finally {
              }
            } catch (fetchError) {
              console.error(
                "Error occurred while fetching new template link:",
                fetchError
              );
            }
          }
        } else {
          console.error("Failed to create or fetch user table.");
          console.error(
            "Unexpected structure in createusertable:",
            JSON.stringify(createusertable)
          );
        }
      } catch (userTableError) {
        console.error(
          "Error occurred while fetching user table:",
          userTableError
        );
      }

      // Validate that objectType is available
      if (!objectType) {
        console.error("Error: Missing objectType.");
        setIsLoading(false);
        return;
      }

      const primaryobjectType = objectType;

      // Fetch config data from 'hubdbHelper'
      try {
        const userId = context.user.id;

        const configDataResponse = await hubspot.fetch({
          name: "hubdbHelper",
          parameters: {
            objectType: objectType,
            userId: userId, // Include userId in the parameters
          },
        });

        if (configDataResponse?.response?.body) {
          configData =
            JSON.parse(configDataResponse.response.body).values || {};
          const fields =
            configData.textboxFields?.split(",").map((field) => field.trim()) ||
            [];
          const filters =
            configData.textboxFilters
              ?.split(",")
              .map((filter) => filter.trim()) || [];
          const dataFields =
            configData.dataFields?.split(",").map((field) => field.trim()) ||
            [];
          setFieldsArray(fields);
          setFiltersArray(filters);
          setDataArray(dataFields);

          // Log dataFields for debugging
          console.log("Pulled dataFields:", dataFields);

          const propertiesToWatch = configData.textboxFields
            ? configData.textboxFields.split(",").map((field) => field.trim())
            : [];
          setpropertiesToWatch(propertiesToWatch);

          // Fetch CRM properties if fields are available
          if (fields.length > 0) {
            try {
              const userId = context.user.id;

              const propertiesResponse = await hubspot.fetch({
                name: "getObjectProperties",
                parameters: {
                  objectId: context.crm.objectId,
                  objectType: objectType,
                  properties: fields,
                  userId: userId, // Include userId in the parameters
                },
              });

              if (propertiesResponse?.response?.body) {
                propertiesBody =
                  JSON.parse(propertiesResponse.response.body)
                    .mappedProperties || {};
                console.log("Fetched CRM Properties:", propertiesBody);
                if (objectType === "DEAL") {
                  setStage(propertiesBody.dealstage);
                }
              } else {
                console.error(
                  "Failed to fetch CRM properties:",
                  propertiesResponse
                );
              }
            } catch (propertiesError) {
              console.error(
                "Error occurred while fetching CRM properties:",
                propertiesError
              );
            }
          }

          // Group dynamic fields by their object types (parsed from dataFields)
          const objectTypeFieldsMap = {};

          // Dynamically group dataFields by their object types (e.g., deal, contact, etc.)
          dataFields.forEach((dataField) => {
            const parts = dataField.split("."); // Split the dataField
            if (parts.length === 2) {
              const [objectType, field] = parts;
              if (!objectTypeFieldsMap[objectType]) {
                objectTypeFieldsMap[objectType] = [];
              }
              objectTypeFieldsMap[objectType].push(field);
            } else if (parts.length === 1) {
              // Handle fields without an explicit objectType
              const defaultObjectType = context.crm.objectTypeId; // Get the default objectType from context
              const field = parts[0];
              if (!objectTypeFieldsMap[defaultObjectType]) {
                objectTypeFieldsMap[defaultObjectType] = [];
              }
              objectTypeFieldsMap[defaultObjectType].push(field);
            } else {
              console.error(`Invalid dataField format: ${dataField}`);
            }
          });

          for (const [objectType, fieldsForObject] of Object.entries(
            objectTypeFieldsMap
          )) {
            try {
              const userId = context.user.id;

              const dynamicpropertiesResponse = await hubspot.fetch({
                name: "getObjectProperties",
                parameters: {
                  objectId: context.crm.objectId,
                  objectType: objectType,
                  properties: fields,
                  userId: userId, // Include userId in the parameters
                },
              });

              if (dynamicpropertiesResponse?.response?.body) {
                const responseBody = JSON.parse(
                  dynamicpropertiesResponse.response.body
                );
                const dynamicpropertiesBody =
                  responseBody.mappedProperties || {};

                console.log(
                  `Fetched properties for dynamic objectType (${objectType}):`,
                  dynamicpropertiesBody
                );

                let mappeddynamicproperties = {};

                // Iterate over dataFields and map to mappeddynamicproperties
                dataFields.forEach((dataField) => {
                  const parts = dataField.split("."); // e.g., 'deal.dealstage'

                  // Only update fields with the correct prefix (e.g., deal.amount for deal objectType)
                  if (parts.length === 2 && parts[0] === objectType) {
                    const [objectTypePrefix, field] = parts;
                    const fieldValue = dynamicpropertiesBody[field]; // Get the value for the field
                    if (fieldValue !== null && fieldValue !== "") {
                      mappeddynamicproperties[dataField] = fieldValue; // Only map if value is non-empty
                    }
                  } else if (parts.length === 1) {
                    // Handle fields without an explicit objectType (using default)
                    const field = parts[0];
                    const fieldValue = dynamicpropertiesBody[field]; // Get the value for the field
                    if (fieldValue !== null && fieldValue !== "") {
                      mappeddynamicproperties[dataField] = fieldValue; // Only map if value is non-empty
                    }
                  }
                });

                // Merge new properties with the existing ones, but only overwrite if non-empty
                setDynamicProperties((prevProperties) => ({
                  ...prevProperties,
                  ...mappeddynamicproperties,
                }));

                console.log(
                  "Mapped Dynamic Properties after fetching:",
                  mappeddynamicproperties
                );
              } else {
                console.error(
                  `Failed to fetch properties for dynamic objectType (${objectType})`,
                  dynamicpropertiesResponse
                );
              }
            } catch (error) {
              console.error(
                `Error fetching properties for dynamic objectType (${objectType}):`,
                error
              );
            }
          }

          try {
            // Check if the object is a 'deal'
            console.log("Starting deal check for lineItems:");
            if (objectType === "DEAL") {
              // Make your API call to fetch associated line items for the deal
              const userId = context.user.id;

              const lineItemsResponse = await hubspot.fetch({
                name: "fetchLineItems",
                parameters: { dealId: context.crm.objectId, userId: userId }, // Include userId in the parameters
              });

              // Parse the response and return the line items
              const lineItems = JSON.parse(lineItemsResponse.response.body);
              console.log("lineItems:", lineItems);

              setLineitemProperties(lineItems);
            } else {
              console.log(
                "Object type is not a deal, skipping line item fetch."
              );
            }
          } catch (error) {
            console.error("Error fetching line items:", error);
          }

          // Fetch templates from 'fetchJsonData'
          if (templateLink) {
            console.log("Applying templates");
            try {
              const templatesResponse = await hubspot.fetch({
                name: "fetchJsonData",
                parameters: { templateLink },
              });

              if (templatesResponse?.response?.body) {
                const data = JSON.parse(templatesResponse.response.body);
                const fetchedTemplates = data.templatesresponse || [];
                setfullTemplates(fetchedTemplates);

                if (
                  fields.length &&
                  filters.length &&
                  Object.keys(propertiesBody).length > 0
                ) {
                  const filtered = fetchedTemplates.filter((template) => {
                    return fields.every((field, index) => {
                      const categoryName = filters[index];
                      const propertyValue =
                        propertiesBody[field]?.toLowerCase();
                      const category = template.categories.find(
                        (c) =>
                          c.category_name.toLowerCase() ===
                          categoryName.toLowerCase()
                      );
                      return (
                        category &&
                        category.values
                          .map((v) => v.toLowerCase())
                          .includes(propertyValue)
                      );
                    });
                  });
                  setTemplates(
                    filtered.length > 0 ? filtered : fetchedTemplates
                  );
                  setFilteredTemplates(
                    filtered.length > 0 ? filtered : fetchedTemplates
                  );
                  setInitialFilteredTemplates(
                    filtered.length > 0 ? filtered : fetchedTemplates
                  );
                  setIsLoading(false);
                } else {
                  console.warn(
                    "Missing data for filtering. Showing all templates."
                  );
                  setTemplates(fetchedTemplates);
                  setFilteredTemplates(fetchedTemplates);
                  setInitialFilteredTemplates(fetchedTemplates);

                  setIsLoading(false);
                }
              } else {
                console.error("Error fetching templates:", templatesResponse);
              }
            } catch (templatesError) {
              console.error(
                "Error occurred while fetching templates:",
                templatesError
              );
            }
          } else {
            console.error("Error: Missing template link to fetch templates.");

            if (currentRefreshToken) {
              setShowTemplates(true);
              setIsLoading(false);
            } else {
              setShowTemplates(false);
              setIsLoading(false);
              actions.addAlert({
                title: "Error with template sync",
                variant: "danger",
                message: `There was an error fetching templates. Please try connecting to Marq again`,
              });
            }
          }
        } else {
          console.error("Failed to load config data:", configDataResponse);
        }
      } catch (configError) {
        console.error(
          "Error occurred while fetching config data:",
          configError
        );
      }
    } catch (error) {
      console.error("Error in fetchConfigCrmPropertiesAndTemplates:", error);
    }
  };

  const filterTemplates = (
    allTemplates,
    searchTerm,
    fieldsArray,
    filtersArray,
    properties
  ) => {
    let filtered = Array.isArray(allTemplates) ? allTemplates : [];

    // Dynamically extract filters
    const categoryFilters = extractFiltersFromProperties(
      fieldsArray,
      filtersArray,
      properties
    );

    // Apply category filters with additional logic to include templates without certain filters
    filtered = filtered.filter((template) =>
      categoryFilters.every(
        (filter) =>
          Array.isArray(template.categories) &&
          template.categories.some(
            (category) =>
              (category.category_name === filter.name &&
                category.values.includes(filter.value)) ||
              (category.category_name === filter.name &&
                category.values.length === 0) // Include templates with no values for the category
          )
      )
    );

    // Apply search filter (searching within all templates)
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((template) =>
        template?.title?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (filtered.length === 0) {
      filtered = allTemplates;
    }

    setFilteredTemplates(filtered);
    setTotalPages(Math.ceil(filtered.length / RECORDS_PER_PAGE));
    setCurrentPage(1); // Reset to first page
  };

  const deleteRecord = async (recordId, objectType) => {
    try {
      const userId = context.user.id; // Retrieve userId from context

      await hubspot.fetch({
        name: "deleteRecord",
        parameters: {
          recordId: recordId,
          objectType: objectType,
          userId: userId,
        }, // Include userId in the parameters
      });

      // Remove the deleted record from the projects state
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.objectId !== recordId)
      );

      // Add success alert
      actions.addAlert({
        title: "Success",
        message: "Project deleted successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error deleting project:", error);

      // Add error alert
      actions.addAlert({
        title: "Error",
        variant: "error",
        message: `Failed to delete project: ${error.message}`,
      });
    }
  };

  function formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    };
    const date = new Date(dateString);
    return date.toLocaleString("en-US", options);
  }

  const fetchAssociatedProjectsAndDetails = useCallback(
    async (objectType) => {
      // console.log("Fetching projects");
      if (!context.crm.objectId) {
        console.error("No object ID available to fetch associated projects.");
        return [];
      }

      try {
        const userId = context.user.id;

        const associatedProjectsResponse = await hubspot.fetch({
          name: "fetchProjects",
          parameters: {
            fromObjectId: context.crm.objectId,
            fromObjectType: objectType,
            userId: userId, // Include userId in the parameters
          },
        });

        if (
          associatedProjectsResponse &&
          associatedProjectsResponse.response &&
          associatedProjectsResponse.response.body
        ) {
          const projectsData = JSON.parse(
            associatedProjectsResponse.response.body
          );
          // console.log("Fetched project data:", projectsData);

          if (
            projectsData &&
            projectsData.results &&
            projectsData.results.length > 0
          ) {
            const uniqueProjectIds = new Set(
              projectsData.results.flatMap((p) =>
                p.to ? p.to.map((proj) => proj.id) : []
              )
            );

            const userId = context.user.id;

            const projectDetailsResponse = await hubspot.fetch({
              name: "fetchProjectDetails",
              parameters: {
                objectIds: Array.from(uniqueProjectIds),
                userId: userId,
              }, // Include userId in the parameters
            });

            if (
              projectDetailsResponse &&
              projectDetailsResponse.response &&
              projectDetailsResponse.response.body
            ) {
              const projectDetails = JSON.parse(
                projectDetailsResponse.response.body
              );

              const uniqueDetailedProjects = new Map();
              projectsData.results.forEach((project) => {
                project.to.forEach((p) => {
                  const detail = projectDetails.find(
                    (d) => d.objectId === p.id
                  );
                  if (detail) {
                    uniqueDetailedProjects.set(p.id, { ...p, ...detail });
                  } else {
                    uniqueDetailedProjects.set(p.id, p);
                  }
                });
              });

              const detailedProjects = Array.from(
                uniqueDetailedProjects.values()
              );
              detailedProjects.sort(
                (a, b) =>
                  new Date(b.hs_lastmodifieddate) -
                  new Date(a.hs_lastmodifieddate)
              );

              // Update state
              setProjects(detailedProjects);
              const totalPages = Math.ceil(
                detailedProjects.length / RECORDS_PER_PAGE
              );
              setTotalPages(totalPages);
              setDataFetched(true);

              // Return the detailed projects
              return detailedProjects;
            }
          }
        }
        return [];
      } catch (error) {
        console.error("Failed to fetch associated projects:", error);
        setDataFetched(true);
        actions.addAlert({
          title: "API Error",
          variant: "error",
          message: `Error fetching associated projects: ${error.message || "No error message available"}`,
        });
        return [];
      }
    },
    [context.crm.objectId, hubspot.fetch, actions]
  );

  const editClick = async (projectId, fileId, encodedoptions) => {
    let editoriframeSrc = "https://info.marq.com/loading";

    // Set iframe to loading
    setIframeUrl(editoriframeSrc);
    actions.openIframeModal({
      uri: editoriframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);

    try {
      const userId = context.user.id;
      const contactId = context.crm.objectId;

      const createaccounttable = await hubspot.fetch({
        name: "fetchAccountTable",
        parameters: { objectType: objectType, userId: userId }, // Include userId in the parameters
      });

      if (!createaccounttable?.response?.body) {
        console.error(
          "No response body from serverless function. Aborting poll."
        );
        return;
      }

      let accountTableResponseBody = {};
      try {
        accountTableResponseBody = JSON.parse(createaccounttable.response.body);
      } catch (err) {
        console.error("Failed to parse response body as JSON:", err);
        return;
      }

      const accountData = accountTableResponseBody?.dataRow?.values || {};
      const matchedData = accountTableResponseBody?.objectTypeRow?.values || {};

      // console.log('accountData:', accountData);

      // Extract the refresh token
      currentAccountRefreshToken = accountData?.refreshToken || null;
      marqAccountId = accountData?.accountId || null;
      datasetid = matchedData?.datasetid || null;
      collectionid = matchedData?.collectionid || null;

      if (!marqAccountId) {
        console.error("marqAccountId is missing, cannot proceed.");
        return;
      }

      if (currentAccountRefreshToken) {
        // console.log("Account refresh token:", currentAccountRefreshToken);
        // tokenSource = 'account';
      } else {
        // console.log("No account refresh token found.");
      }

      await updateData(currentAccountRefreshToken);

      let editorinnerurl = `https://app.marq.com/documents/showIframedEditor/${projectId}/0?embeddedOptions=${encodedoptions}&creatorid=${userId}&contactid=${contactId}&apikey=${apiKey}&objecttype=${objectType}&fileid=${fileId}`;
      const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(editorinnerurl)}`;

      editoriframeSrc =
        "https://info.marq.com/marqembed?iframeUrl=" +
        encodeURIComponent(baseInnerUrl);

      setIframeUrl(editoriframeSrc);
      actions.openIframeModal({
        uri: editoriframeSrc,
        height: 1500,
        width: 1500,
        title: "Marq Editor",
      });
      setIframeOpen(true);
    } catch (error) {
      console.error("Error in editClick:", error);
    }
  };

  const sendEmail = async (project) => {
    try {
      const response = await hubspot.fetchFunction({
        name: "generateEmailContent",
        parameters: { project },
      });

      if (response && response.emailContent) {
        const emailContent = response.emailContent;
        // Open the email composition window with the generated content
        actions.openEmailComposeWindow({
          to: project.contactEmail,
          subject: `Details for project ${project.name}`,
          body: emailContent,
        });
      }
    } catch (error) {
      console.error("Failed to generate email content:", error);
    }
  };

  const extractFiltersFromProperties = (
    fieldsArray,
    filtersArray,
    properties
  ) => {
    let filters = [];

    fieldsArray.forEach((field, index) => {
      if (properties[field]) {
        const fieldValue = properties[field];
        const filterValue = filtersArray[index];
        filters.push({ name: filterValue, value: fieldValue });
      }
    });

    return filters;
  };

  const handleOnSort = (fieldName, currentDirection) => {
    let newDirection = "descending";
    if (currentDirection === "ascending") {
      newDirection = "descending";
    } else if (currentDirection === "descending") {
      newDirection = "none";
    } else {
      newDirection = "ascending";
    }

    setSortConfig({ field: fieldName, direction: newDirection });

    const sortedProjects = [...projects];
    if (newDirection !== "none") {
      sortedProjects.sort((a, b) => {
        if (a[fieldName] < b[fieldName]) {
          return newDirection === "ascending" ? -1 : 1;
        }
        if (a[fieldName] > b[fieldName]) {
          return newDirection === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    setProjects(sortedProjects);
  };

  const refreshProjects = async () => {
    // console.log("Calling refresh projects");

    if (!shouldPollForProjects.isPolling) {
      // console.log("Polling stopped: shouldPollForProjects.isPolling is false in refreshProjects");
      return;
    }

    let templateIdToMatch;

    templateIdToMatch = shouldPollForProjects.templateId;

    if (objectType && templateIdToMatch) {
      const projectsList = await fetchAssociatedProjectsAndDetails(objectType);

      // Check for matching project
      const matchingProject = projectsList.find(
        (project) => project.originaltemplateid === templateIdToMatch
      );

      if (matchingProject) {
        // console.log(`Found matching project for template ID: ${templateIdToMatch}`);
        setShouldPollForProjects({ isPolling: false, templateId: null });
        setLoadingTemplateId(null);
        templateIdToMatch = null;

        // Stop polling
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }

        return;
      }

      // Update the state to ensure `projects` reflects the latest data
      setProjects(projectsList);
    } else {
      // console.log("Object type not detected");
    }
  };

  const setapi = async (userid, userEmail) => {
    try {
      const apiResponse = await hubspot.fetch({
        name: "getApiKey",
      });

      if (apiResponse && apiResponse.response && apiResponse.response.body) {
        const body = JSON.parse(apiResponse.response.body);
        if (body && body.key) {
          const apiKey = body.key;
          setAPIkey(apiKey);
          //  console.log("API Key loaded:", apiKey);
          const authorizationUrl = await handleConnectToMarq(
            apiKey,
            userid,
            userEmail,
            "user"
          ); // Pass the API key, userid, and userEmail
          setauth(authorizationUrl);
          const accountauthorizationUrl = await handleConnectToMarq(
            apiKey,
            userid,
            userEmail,
            "data"
          );
          setAccountAuthorizationUrl(accountauthorizationUrl);
          return apiKey; // Return the API key
        } else {
          console.error("No API key found in response.");
          actions.addAlert({
            title: "Error",
            variant: "error",
            message: "Failed to retrieve API key.",
          });
        }
      } else {
        console.error("API response was invalid or missing.");
        actions.addAlert({
          title: "Error",
          variant: "error",
          message: "Invalid API response.",
        });
      }
    } catch (error) {
      console.error("Error retrieving API key:", error);
      actions.addAlert({
        title: "Error",
        variant: "error",
        message: "Failed to retrieve API key.",
      });
    }
    return null; // Return null if the API key was not retrieved
  };

  const updateAccountRefreshToken = async (currentRefreshToken) => {
    try {
      const userId = context.user.id;

      const updateAccountRefreshResponse = await hubspot.fetch({
        name: "updateAccountRefresh",
        parameters: {
          refreshToken: currentRefreshToken,
          userId: userId, // Include userId in the parameters
        },
      });
      

      if (updateAccountRefreshResponse?.response?.statusCode === 200) {
        // console.log('Account refresh token updated successfully in marq_account_data table');
      } else {
        console.error(
          "Failed to update account refresh token:",
          updateAccountRefreshResponse?.response?.body
        );
      }
    } catch (error) {
      console.error("Error updating account refresh token:", error);
    }
  };

  const updateUserRefreshToken = async (marquserId, currentRefreshToken) => {
    try {
      const userId = context.user.id; // Get the user ID

      await hubspot.fetch({
        name: "updateUserRefresh",
        parameters: {
          marquserId: marquserId,
          newrefreshtoken: currentRefreshToken,
          userId: userId, // Include userId
        },
      });
      

      // console.log("User refresh token updated:", updateUserRefreshResponse);
    } catch (error) {
      console.error("Error occurred while updating user refresh token:", error);
    }
  };

  const updateData = async (currentAccountRefreshToken) => {
    console.log("Starting updateData...");
    console.log("dynamicProperties before merge:", dynamicProperties);

    if (currentAccountRefreshToken) {
      try {
        const properties = {};

        // Merge dynamicProperties into the properties object
        const updatedProperties = {
          ...properties,
          ...dynamicProperties,
        };

        const numberOfLineItems = Math.min(10, lineitemProperties.length); // Allow up to 10 line items
        const updatedSchema = [
          { name: "Id", fieldType: "STRING", isPrimary: true, order: 1 },
          {
            name: "Marq User Restriction",
            fieldType: "STRING",
            isPrimary: false,
            order: 2,
          },
        ];

        // Function to format numbers as currency
        const formatCurrency = (value) => {
          if (!isNaN(value) && value !== "" && value !== "null") {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }).format(value);
          }
          return ""; // Return empty string if not a valid number
        };

        // Function to capitalize the first letter of a string
        const capitalizeFirstLetter = (string) => {
          return string.charAt(0).toUpperCase() + string.slice(1);
        };

        const calculateRecurringBillingEndDate = (
          periodValue,
          startDateValue,
          termYears
        ) => {
          // Parse the start date if provided, else default to today
          const startDate = startDateValue
            ? new Date(startDateValue)
            : new Date();

          // Check if the periodValue is in the expected format and contains "M"
          if (
            periodValue &&
            typeof periodValue === "string" &&
            periodValue.startsWith("P") &&
            periodValue.includes("M")
          ) {
            const months = parseInt(
              periodValue.replace("P", "").replace("M", "")
            );
            if (!isNaN(months)) {
              const endDate = new Date(startDate);
              endDate.setMonth(startDate.getMonth() + months);

              // Check if the day changes due to the month transition and adjust
              if (endDate.getDate() !== startDate.getDate()) {
                endDate.setDate(0); // Move to the last valid day of the previous month if day mismatch occurs
              }

              return endDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
            }
          }

          // If hs_recurring_billing_period is missing or invalid, use term__years_ as backup
          if (termYears && !isNaN(termYears)) {
            const endDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + parseInt(termYears));
            return endDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
          }

          // Return an empty string if no valid period or term is found
          return "";
        };

        // Only process line items if the objectType is 'DEAL'
        if (objectType === "DEAL") {
          for (let i = 0; i < 10; i++) {
            // Check if the line item exists
            const lineItem = lineitemProperties[i] || null;

            if (lineItem) {
              // If the line item exists, populate the properties with real values
              Object.keys(lineItem.properties).forEach((propertyKey) => {
                const dynamicFieldName = `lineitem${i + 1}.${propertyKey}`;

                // Check if the property is a currency-related field
                if (
                  [
                    "price",
                    "discount",
                    "tax",
                    "amount",
                    "hs_cost_of_goods_sold",
                  ].includes(propertyKey)
                ) {
                  updatedProperties[dynamicFieldName] =
                    !isNaN(lineItem.properties[propertyKey]) &&
                    lineItem.properties[propertyKey] !== null
                      ? formatCurrency(lineItem.properties[propertyKey])
                      : lineItem.properties[propertyKey] || "";
                } else {
                  updatedProperties[dynamicFieldName] =
                    typeof lineItem.properties[propertyKey] === "string"
                      ? capitalizeFirstLetter(lineItem.properties[propertyKey])
                      : lineItem.properties[propertyKey] || "";
                }

                // Add the property to the schema, capitalize the first letter of the propertyKey
                updatedSchema.push({
                  name: dynamicFieldName,
                  fieldType: "STRING",
                  isPrimary: false,
                  order: updatedSchema.length + 1,
                });
              });

              const endDateFieldName = `lineitem${i + 1}.recurring_billing_end_date`;

              // Add calculated recurring_billing_end_date to the properties and schema if hs_recurring_billing_period exists
              if (lineItem.properties.recurringbillingfrequency) {
                const recurringBillingEndDate =
                  calculateRecurringBillingEndDate(
                    lineItem.properties.hs_recurring_billing_period,
                    lineItem.properties.hs_recurring_billing_start_date,
                    lineItem.properties.term__years_
                  );
                updatedProperties[endDateFieldName] = recurringBillingEndDate;
              } else {
                updatedProperties[endDateFieldName] = ""; // Set a blank value if it's missing
              }

              // Check if recurringbillingfrequency exists, if not, set to "One-time"
              if (
                !lineItem.properties.recurringbillingfrequency ||
                lineItem.properties.recurringbillingfrequency.trim() === ""
              ) {
                updatedProperties[
                  `lineitem${i + 1}.recurringbillingfrequency`
                ] = "One-time";
              }

              updatedSchema.push({
                name: endDateFieldName,
                fieldType: "STRING",
                isPrimary: false,
                order: updatedSchema.length + 1,
              });
            } else {
              // If the line item doesn't exist, populate the schema with real property names but set values to ""
              Object.keys(lineitemProperties[0].properties).forEach(
                (propertyKey) => {
                  const dynamicFieldName = `lineitem${i + 1}.${propertyKey}`;

                  // Set value to "" for missing line items
                  updatedProperties[dynamicFieldName] = "";

                  // Add the property to the schema, capitalize the first letter of the propertyKey
                  updatedSchema.push({
                    name: dynamicFieldName,
                    fieldType: "STRING",
                    isPrimary: false,
                    order: updatedSchema.length + 1,
                  });
                }
              );

              // Add a blank recurring_billing_end_date to the properties and schema for missing line items
              const endDateFieldName = `lineitem${i + 1}.recurring_billing_end_date`;
              updatedProperties[endDateFieldName] = ""; // No value as the line item is missing
              updatedSchema.push({
                name: endDateFieldName,
                fieldType: "STRING",
                isPrimary: false,
                order: updatedSchema.length + 1,
              });
            }
          }
        }

        // Iterate over dynamicProperties and add them to updatedSchema
        Object.keys(dynamicProperties).forEach((propertyKey) => {
          const dynamicFieldName = propertyKey; // Use the property key as the field name

          // Update the properties object
          updatedProperties[dynamicFieldName] = dynamicProperties[propertyKey];

          // Add this property to the schema if it's not already present
          const alreadyInSchema = updatedSchema.some(
            (item) => item.name === capitalizeFirstLetter(dynamicFieldName)
          );
          if (!alreadyInSchema) {
            updatedSchema.push({
              name: dynamicFieldName, // Capitalize the first letter
              fieldType: "STRING",
              isPrimary: false,
              order: updatedSchema.length + 1, // Increment the order correctly
            });
          }
        });

        // Append the Id field to the properties object
        updatedProperties["Id"] = context.crm.objectId?.toString() || "";
        updatedProperties["Marq User Restriction"] = context.user.email;

        console.log("updatedProperties", updatedProperties);

        const clientid = "wfcWQOnE4lEpKqjjML2IEHsxUqClm6JCij6QEXGa";
        const clientsecret =
          "YiO9bZG7k1SY-TImMZQUsEmR8mISUdww2a1nBuAIWDC3PQIOgQ9Q44xM16x2tGd_cAQGtrtGx4e7sKJ0NFVX";

        // Call update-data3 function
        console.log("Starting updateData3");
        const updateDataResponse = await hubspot.fetch({
          name: "updateData3",
          parameters: {
            refresh_token: currentAccountRefreshToken,
            clientid: clientid,
            clientsecret: clientsecret,
            collectionId: collectionid,
            properties: updatedProperties,
            schema: updatedSchema,
            dataSourceId: datasetid,
          },
        });

        // Check if the response was successful
        if (
          updateDataResponse?.response?.statusCode === 200 ||
          updateDataResponse?.response?.statusCode === 201
        ) {
          console.log("Data updated successfully before project creation");

          // **Parse the response body**
          let responseBody = updateDataResponse.response.body;
          if (typeof responseBody === "string") {
            try {
              responseBody = JSON.parse(responseBody);
            } catch (e) {
              console.error("Failed to parse response body as JSON:", e);
              responseBody = {};
            }
          }

          // Extract the new refresh token from the parsed response
          const newAccountRefreshToken = responseBody?.new_refresh_token;

          if (newAccountRefreshToken) {
            // Call updateAccountRefreshToken to update the token in your system
            await updateAccountRefreshToken(newAccountRefreshToken);
          } else {
            setIsAccountTokenClicked(false);
            setShowAccountTokenButton(true);
          }
        } else {
          console.error(
            "Failed to update data before project creation",
            updateDataResponse?.response?.body
          );

          // If an error occurred, set the refresh token to blank
          await updateAccountRefreshToken("");
          setIsAccountTokenClicked(false);
          setShowAccountTokenButton(true);
        }
      } catch (error) {
        console.error("Error during update-data3 execution:", error);

        // On error, set the refresh token to blank
        await updateAccountRefreshToken("");
        setIsAccountTokenClicked(false);
        setShowAccountTokenButton(true);
        console.log("Refresh token set to blank due to error");
      }
    }
  };

  const handleClick = async (template) => {
    let iframeSrc = "https://info.marq.com/loading";

    // Set iframe to loading
    setIframeUrl(iframeSrc);
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);

    try {
      const userId = context.user.id;

      const createusertable = await hubspot.fetch({
        name: "marqouathhandler",
        parameters: { userId: userId },
      });
      const responseBody = JSON.parse(createusertable.response.body);
      const userData = responseBody?.row?.values || {};
      currentRefreshToken = userData?.refreshToken || null;

      if (
        !currentRefreshToken ||
        currentRefreshToken === "null" ||
        currentRefreshToken === ""
      ) {
        setShowTemplates(false);
        return;
      }

      let tokenSource = "user"; // Default to user token
      let refreshTokenToUse = currentRefreshToken;
      let accountrefreshTokenToUse = currentAccountRefreshToken;

      const createaccounttable = await hubspot.fetch({
        name: "fetchAccountTable",
        parameters: { objectType: objectType, userId: userId }, // Include userId in the parameters
      });

      if (!createaccounttable?.response?.body) {
        console.error(
          "No response body from serverless function. Aborting poll."
        );
        return;
      }

      let accountTableResponseBody = {};
      try {
        accountTableResponseBody = JSON.parse(createaccounttable.response.body);
      } catch (err) {
        console.error("Failed to parse response body as JSON:", err);
        return;
      }

      const accountData = accountTableResponseBody?.dataRow?.values || {};
      const matchedData = accountTableResponseBody?.objectTypeRow?.values || {};

      // Extract the refresh token
      currentAccountRefreshToken = accountData?.refreshToken || null;
      marqAccountId = accountData?.accountId || null;
      datasetid = matchedData?.datasetid || null;
      collectionid = matchedData?.collectionid || null;

      if (!marqAccountId) {
        console.error("marqAccountId is missing, cannot proceed.");
        return;
      }

      if (currentAccountRefreshToken) {
        // tokenSource = 'account';
      } else {
      }

      if (currentRefreshToken) {
        try {
          const createusertable = await hubspot.fetch({
            name: "marqouathhandler",
            parameters: { userId: userId },
          });
          const responseBody = JSON.parse(createusertable.response.body);
          const userData = responseBody?.row?.values || {};
          refreshTokenToUse = userData?.refreshToken || null;

          if (
            !refreshTokenToUse ||
            refreshTokenToUse === "null" ||
            refreshTokenToUse === ""
          ) {
            setShowTemplates(false);
            return;
          }
        } catch (error) {
          console.error("Error while fetching user refresh token:", error);
          return;
        }
      }

      // const clientid = "wfcWQOnE4lEpKqjjML2IEHsxUqClm6JCij6QEXGa";
      // const clientsecret =
      //   "YiO9bZG7k1SY-TImMZQUsEmR8mISUdww2a1nBuAIWDC3PQIOgQ9Q44xM16x2tGd_cAQGtrtGx4e7sKJ0NFVX";
      const clientid = process.env.CLIENT_ID;
      const clientsecret = process.env.CLIENT_SECRET;
      const marqaccountid = marqAccountId;
      const marquserId = marquserid;
      const recordid = context.crm?.objectId?.toString() || "";
      const templateid = template?.id || "";
      const templatetitle = template?.title || "";

      await updateData(currentAccountRefreshToken);

      // 4. Create the project using the user refresh token

      try {
        const createProjectResponse = await hubspot.fetch({
          name: "createProject",
          parameters: {
            refresh_token: refreshTokenToUse,
            clientid: clientid,
            clientsecret: clientsecret,
            marquserId: marquserId,
            recordid: recordid,
            templateid: templateid,
            templatetitle: templatetitle,
            marqaccountid: marqaccountid,
            dataSetId: datasetid,
          },
        });

        // Log the entire response for debugging

        let projectId = "";

        // Check if response status is successful
        if (
          createProjectResponse?.response?.statusCode === 200 ||
          createProjectResponse?.response?.statusCode === 201
        ) {
          try {
            const projectData = JSON.parse(createProjectResponse.response.body);
            console.log("Project created successfully:", projectData);

            // Ensure projectId is extracted correctly
            projectId = projectData.documentid;
            if (!projectId) {
              console.warn(
                "Failed to create project through the API - reverting to URL method."
              );
              iframeFallback(template.id); // Fallback in case of failure
              return;
            }

            const encodedOptions = encodeURIComponent(
              btoa(
                JSON.stringify({
                  enabledFeatures: configData.enabledFeatures?.map(
                    (feature) => feature.name
                  ) || ["share"],
                  fileTypes: configData.fileTypes?.map(
                    (fileType) => fileType.name
                  ) || ["pdf"],
                  showTabs: configData.showTabs?.map((tab) => tab.name) || [
                    "templates",
                  ],
                })
              )
            );

            const contactId = context.crm.objectId;
            const userId = context.user.id;
            const returnUrl = `https://app.marq.com/documents/showIframedEditor/${projectId}/0?embeddedOptions=${encodedOptions}&creatorid=${userId}&contactid=${contactId}&apikey=${apiKey}&objecttype=${objectType}&dealstage=${stageName}&templateid=${template.id}`;
            const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(returnUrl)}`;

            iframeSrc =
              "https://info.marq.com/marqembed?iframeUrl=" +
              encodeURIComponent(baseInnerUrl);

            // Update refresh token after project creation
            const newRefreshToken = projectData.new_refresh_token || ""; // Set to "" if not found

            // Update the corresponding refresh token
            await updateUserRefreshToken(marquserId, newRefreshToken);
          } catch (parseError) {
            console.error(
              "Error parsing project creation response:",
              parseError
            );
            console.error(
              "Raw response body:",
              createProjectResponse.response.body
            );
            await updateUserRefreshToken(marquserId, ""); // Clear refresh token on failure
            iframeFallback(template.id); // Fallback in case of error
            return;
          }
        } else {
          console.error(
            "Failed to create project. Received response status:",
            createProjectResponse?.response?.statusCode
          );
          console.error("Response details:", createProjectResponse?.response);
          await updateUserRefreshToken(marquserId, ""); // Clear refresh token on failure
          iframeFallback(template.id); // Fallback in case of failure
          return;
        }
      } catch (error) {
        console.error("Error occurred during project creation:", error);
        if (error.response) {
          console.error("Error response status:", error.response.status);
          console.error("Error response data:", error.response.data);
        }
        // Set refresh token to an empty string if there's a request error
        await updateUserRefreshToken(marquserId, "");
        iframeFallback(template.id); // Fallback in case of error
        return;
      }

      // Opening the iframe with the appropriate source
      setIframeUrl(iframeSrc);
      actions.openIframeModal({
        uri: iframeSrc,
        height: 1500,
        width: 1500,
        title: "Marq",
      });
      setIframeOpen(true);
      setShouldPollForProjects({ isPolling: true, templateId: template.id });
    } catch (error) {
      console.error("Error in handleClick:", error);
      iframeFallback(template.id);

      setShowTemplates(false);
      setIsLoading(false);

      // Show an alert to the user in case of error
      actions.addAlert({
        title: "Error with creating project",
        variant: "danger",
        message:
          "There was an error with creating the project. Please try connecting to Marq again.",
      });
    }
  };

  /**
   * Fallback function to revert to the URL method in case of any failure
   */
  function iframeFallback(templateId) {
    let iframeSrc = "https://info.marq.com/loading";

    // Set iframe to loading
    setIframeUrl(iframeSrc);
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);

    const encodedOptions = encodeURIComponent(
      btoa(
        JSON.stringify({
          enabledFeatures: configData.enabledFeatures?.map(
            (feature) => feature.name
          ) || ["share"],
          fileTypes: configData.fileTypes?.map((fileType) => fileType.name) || [
            "pdf",
          ],
          showTabs: configData.showTabs?.map((tab) => tab.name) || [
            "templates",
          ],
        })
      )
    );

    const contactId = context.crm.objectId;
    const userId = context.user.id;
    const returnUrl = `https://app.marq.com/documents/editNewIframed/${templateId}?embeddedOptions=${encodedOptions}&creatorid=${userId}&contactid=${contactId}&apikey=${apiKey}&objecttype=${objectType}&dealstage=${stageName}&templateid=${templateId}`;
    const baseInnerUrl = `https://app.marq.com/documents/iframe?newWindow=false&returnUrl=${encodeURIComponent(returnUrl)}`;

    iframeSrc =
      "https://info.marq.com/marqembed?iframeUrl=" +
      encodeURIComponent(baseInnerUrl);
    setIframeUrl(iframeSrc);
    actions.openIframeModal({
      uri: iframeSrc,
      height: 1500,
      width: 1500,
      title: "Marq",
    });
    setIframeOpen(true);
    setShouldPollForProjects({ isPolling: true, templateId: templateId });
  }

  const startPollingForRefreshToken = () => {
    setIsRefreshTokenClicked(true);
    setIsPolling(true); // Start polling when the button is clicked
  };

  const pollForRefreshToken = async () => {
    try {
      // console.log("Polling for refresh token...");
      const userId = context.user.id;
      const createusertable = await hubspot.fetch({
        name: "marqouathhandler",
        parameters: { userId: userId },
      });

      if (createusertable?.response?.body) {
        // Access row and values properly
        const responseBody = JSON.parse(createusertable.response.body);
        const userData = responseBody?.row?.values || {};

        // Assign to global `currentRefreshToken`
        currentRefreshToken = userData?.refreshToken || null;

        if (
          currentRefreshToken &&
          currentRefreshToken !== "null" &&
          currentRefreshToken !== ""
        ) {
          // console.log("Refresh token found:", currentRefreshToken);
          setIsPolling(false); // Stop polling
          setShowTemplates(true);
          fetchPropertiesAndLoadConfig(objectType); // Ensure objectType is defined
          setIsConnectedToMarq(true); // Assuming this should trigger some UI change
          pollForAccountRefreshToken();
        } else {
          setShowTemplates(false);
        }
      } else {
      }
    } catch (error) {
      console.error("Error while polling for refresh token:", error);
    }
  };

  useEffect(() => {
    let pollInterval;

    if (isPolling) {
      pollInterval = setInterval(pollForRefreshToken, 5000); // Poll every 5 seconds
    }

    return () => {
      clearInterval(pollInterval); // Clean up interval when component unmounts or polling stops
    };
  }, [isPolling]);

  const startPollingForAccountRefreshToken = () => {
    setIsAccountTokenClicked(true);

    setloadingaccountrefreshtoken(true);
    setAccountIsPolling(true); // Start polling when the button is clicked
  };

  const pollForAccountRefreshToken = async () => {
    try {
      // Fetch account data using the serverless function
      const createaccounttable = await hubspot.fetch({
        name: "fetchAccountTable",
        parameters: { objectType: objectType, userId: userId }, // Include userId in the parameters
      });

      if (!createaccounttable?.response?.body) {
        console.error(
          "No response body from serverless function. Aborting poll."
        );
        return;
      }

      try {
        accountResponseBody = JSON.parse(createaccounttable.response.body);
      } catch (err) {
        console.error("Failed to parse response body as JSON:", err);
        return;
      }

      const accountData = accountResponseBody?.dataRow?.values || {};

      // Extract the refresh token
      currentAccountRefreshToken = accountData?.refreshToken || null;
      marqAccountId = accountData?.accountId || null;

      if (!currentAccountRefreshToken) {
        console.warn(
          "No valid account refresh token found, will continue polling."
        );
        setShowAccountTokenButton(true); // Optionally allow the user to retry
        return;
      }

      // Stop polling and hide the account token button
      setAccountIsPolling(false);
      setloadingaccountrefreshtoken(false);
      setShowAccountTokenButton(false);

      // Call the function to create or update the dataset with the refresh token
      try {
        // Call the function to create or update the dataset with the refresh token
        await createOrUpdateDataset(currentAccountRefreshToken);
      } catch (error) {
        console.error("Error creating or updating dataset:", error);
      }
    } catch (error) {
      console.error(
        "Error while polling for account refresh token:",
        error.message || error
      );
      setloadingaccountrefreshtoken(false);
    }
  };

  useEffect(() => {
    let pollAccountInterval;

    // Start polling if the account is set to be polling
    if (isAccountPolling) {
      pollAccountInterval = setInterval(pollForAccountRefreshToken, 5000); // Poll every 5 seconds
    }

    // Cleanup interval when polling stops or component unmounts
    return () => {
      clearInterval(pollAccountInterval);
    };
  }, [isAccountPolling]);

  useEffect(() => {
    const pollingForProjects = async () => {
      if (shouldPollForProjects.isPolling && shouldPollForProjects.templateId) {
        await refreshProjects();
        pollingTimerRef.current = setTimeout(() => {
          pollingForProjects();
        }, 20000);
      } else {
        // Clear the timeout if polling should stop
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    // Start polling only if shouldPollForProjects.isPolling is true
    if (shouldPollForProjects.isPolling && shouldPollForProjects.templateId) {
      pollingForProjects();
    }

    // Cleanup on component unmount or when shouldPollForProjects changes
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [shouldPollForProjects]);


  useEffect(() => {
    // console.log("Filtered Templates Updated:", filteredTemplates);
  }, [filteredTemplates]);

  const handleSearch = useCallback(
    (input) => {
      let searchValue = "";

      // Validate the input
      if (input && input.target && typeof input.target.value === "string") {
        searchValue = input.target.value;
      } else if (typeof input === "string") {
        searchValue = input;
      } else {
        console.error("Unexpected input:", input);
        return; // Exit early if input is invalid
      }

      setSearchTerm(searchValue);

      if (searchValue.trim() === "") {
        // Reset to the initially filtered templates when the search term is cleared
        setFilteredTemplates([...initialFilteredTemplates]);
        // console.log('Initial Filtered Templates in handleSearch:', initialFilteredTemplates);

        setTitle("Relevant Content");
      } else {
        setTitle("Search Results");
      }
    },
    [initialFilteredTemplates]
  );

  useEffect(() => {
    if (searchTerm.trim() === "") {
      // Ensure we only set the initial filtered templates if it's not already set
      if (filteredTemplates.length !== initialFilteredTemplates.length) {
        setFilteredTemplates([...initialFilteredTemplates]);
        // console.log('Reset to Initial Filtered Templates:', initialFilteredTemplates);
      }
      setCurrentPage(1); // Reset to first page
    } else {
      const delayDebounceFn = setTimeout(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const searchResults = fulltemplatelist.filter((template) =>
          template?.title?.toLowerCase().includes(lowerCaseSearchTerm)
        );

        // Update filteredTemplates with the search results
        setFilteredTemplates(searchResults);
        setCurrentPage(1); // Reset to first page on search
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    searchTerm,
    fulltemplatelist,
    initialFilteredTemplates,
    filteredTemplates,
  ]);

  useEffect(() => {
    const pages = Math.ceil(filteredTemplates.length / RECORDS_PER_PAGE);
    setTotalPages(pages);
  }, [filteredTemplates]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * RECORDS_PER_PAGE,
    currentPage * RECORDS_PER_PAGE
  );

  const initialize = async () => {
    // Ensure we haven't initialized already and that objectType is available
    if (!hasInitialized.current && objectType) {
      hasInitialized.current = true;

      // Fetch properties and associated projects for the objectType
      fetchPropertiesAndLoadConfig(objectType);
      fetchAssociatedProjectsAndDetails(objectType);

      try {
        // Fetch user ID and email from context
        const userid = context.user.id;
        const userEmail = context.user.email;

        // Fetch API key and store it
        const apiKey = await setapi(userid, userEmail);

        setAPIkey(apiKey);

        // Step 1: Fetch Marq user data to retrieve the refresh token
        const createusertable = await hubspot.fetch({
          name: "marqouathhandler",
          parameters: { userId: userid },
        });

        if (createusertable?.response?.body) {
          const userData =
            JSON.parse(createusertable.response.body)?.row?.values || {};
          currentRefreshToken = userData.refreshToken || null;

          // Validate refresh token and show templates if available
          if (currentRefreshToken) {
            setIsRefreshTokenClicked(true);
            setShowTemplates(true); // Use setShowTemplates to trigger the display of templates

            // Step 2: Fetch Marq account data if refresh token is valid
            await fetchMarqAccountData();
            // console.log("fetched Marq AccountData")
          } else {
            // No refresh token, handle polling or error case
            setShowTemplates(false); // Explicitly hide templates
            //startPollingForRefreshToken();
          }
        } else {
          console.error("Failed to fetch user table for refresh token.");
        }
      } catch (error) {
        console.error("Error in fetching user data:", error);
      }
    } else if (hasInitialized.current) {
      // If already initialized, filter templates based on search criteria
      filterTemplates(
        fulltemplatelist,
        searchTerm,
        fieldsArray,
        filtersArray,
        crmProperties
      );
    }
  };

  // Separate function to fetch Marq account data
  const fetchMarqAccountData = async () => {
    try {
      const userId = context.user.id;
      const createaccounttable = await hubspot.fetch({
        name: "dataTableHandler",
        parameters: {
          objectType: objectType,
          userId: userId, // Pass the userId as a parameter
        },
      });

      if (createaccounttable?.response?.body) {
        const accountData =
          JSON.parse(createaccounttable.response.body)?.dataRow?.values || {};
        const matchedData =
          JSON.parse(createaccounttable.response.body)?.objectTypeRow?.values ||
          {};
        const currentAccountRefreshToken = accountData.refreshToken || null;
        // console.log("Account refresh token:", currentAccountRefreshToken);

        datasetid = matchedData.datasetid || null;
        collectionid = matchedData.collectionid || null;

        // Validate account refresh token and show/hide button accordingly
        if (currentAccountRefreshToken) {
          setIsAccountTokenClicked(true);
          setShowAccountTokenButton(false);

          if (!datasetid || !collectionid) {
            await createOrUpdateDataset(currentAccountRefreshToken);
          }
        } else {
          setIsAccountTokenClicked(false);
          setShowAccountTokenButton(true);
        }
      } else {
        console.error("Failed to fetch Marq account data.");
        setIsAccountTokenClicked(false);
        setShowAccountTokenButton(true);
      }
    } catch (error) {
      console.error("Error in fetching Marq account data:", error);
    }
  };


  useEffect(() => {
    initialize();
  }, [
    apiKey,
    accessToken,
    currentRefreshToken,
    context.crm.objectId,
    context.crm.objectTypeId,
    objectType,
    fieldsArray,
    filtersArray,
    crmProperties,
    fulltemplatelist,
    searchTerm,
  ]);

  useEffect(() => {
    // Function to create a mapping from cleaned fields to original fields
    const createFieldMapping = (fields) => {
      return fields.reduce((acc, field) => {
        const parts = field.split(".");
        const cleanedField = parts.length > 1 ? parts[1] : parts[0]; // Clean the field name
        acc[cleanedField] = field; // Map cleaned field to the original
        return acc;
      }, {});
    };

    // Function to strip object name prefixes from fields (e.g., 'deal.amount' -> 'amount')
    const cleanFields = (fields) => {
      return fields.map((field) => {
        const parts = field.split(".");
        return parts.length > 1 ? parts[1] : parts[0]; // Use the part after the period if exists
      });
    };

    // Create mappings for fieldsArray and dynamicProperties
    const fieldMapping = createFieldMapping(fieldsArray);
    const dynamicFieldMapping = createFieldMapping(
      Object.keys(dynamicProperties)
    );

    const handlePropertiesUpdate = (updatedProperties) => {
      // Handle updates for fieldsArray
      if (fieldsArray && fieldsArray.length > 0) {
        const hasRelevantChange = fieldsArray.some(
          (field) => updatedProperties[fieldMapping[field]]
        );
        if (hasRelevantChange) {
          fetchPropertiesAndLoadConfig(objectType);
          if (
            hasInitialized.current &&
            filtersArray.length > 0 &&
            Object.keys(crmProperties).length > 0
          ) {
            filterTemplates(
              fulltemplatelist,
              searchTerm,
              fieldsArray,
              filtersArray,
              crmProperties
            );
          }
        }
      }

      // Handle updates for dynamicProperties
      const dynamicFieldsToWatch = Object.keys(dynamicProperties);
      const hasDynamicChange = dynamicFieldsToWatch.some(
        (field) => updatedProperties[dynamicFieldMapping[field]]
      );
      if (hasDynamicChange) {
        const updatedDynamicProps = dynamicFieldsToWatch.reduce(
          (acc, field) => {
            const originalField = dynamicFieldMapping[field];
            if (updatedProperties[originalField]) {
              acc[originalField] = updatedProperties[originalField]; // Use original field name
            }
            return acc;
          },
          {}
        );

        setDynamicProperties((prevProperties) => ({
          ...prevProperties,
          ...updatedDynamicProps,
        }));

        console.log("Updated dynamic properties:", updatedDynamicProps);
      }
    };

    // Combine the fields to watch from both arrays
    const cleanedFieldsArray = cleanFields(fieldsArray);
    const cleanedDynamicFields = cleanFields(Object.keys(dynamicProperties));
    const fieldsToWatch = [...cleanedFieldsArray, ...cleanedDynamicFields];

    if (fieldsToWatch.length > 0) {
      actions.onCrmPropertiesUpdate(fieldsToWatch, handlePropertiesUpdate);
    }

    return () => {
      actions.onCrmPropertiesUpdate([], null);
    };
  }, [
    context.crm.objectId,
    context.crm.objectTypeId,
    objectType,
    fieldsArray,
    filtersArray,
    crmProperties,
    fulltemplatelist,
    searchTerm,
    dynamicProperties,
  ]);

  const handleConnectToMarq = async (
    apiKey,
    userid,
    userEmail,
    metadataType
  ) => {
    try {
      const authorizationUrl = getAuthorizationUrl(
        metadataType,
        apiKey,
        userid,
        userEmail
      ); // Pass userid and userEmail

      if (!authorizationUrl) {
        throw new Error("Failed to generate authorization URL.");
      }
      // console.log(authorizationUrl)

      return authorizationUrl; // Return the URL to be used in the href
    } catch (error) {
      console.error("Error during authorization process:", error.message);
      // You can handle errors here, but avoid using alert since it's not supported.
    }
  };

  function getAuthorizationUrl(metadataType, apiKey, userid, userEmail) {
    try {
      const clientId = "ewn_nCMA1Hr6I0mNLtu4irzVzt29cWn4eqHL2ZnN";
      const clientSecret =
        "LPzHZo2GTtzWYPGL-lu_GxpxGCL_7RDDumN0rAmM_WxiFEhFglAE8MM0EnoDHKXJbJ0k1abBdfOqdZjyhx-Q";
      const redirectUri = "https://info.marq.com/crm-oauth-hubspot";

      const encodedRedirectUri = encodeURIComponent(redirectUri);

      // Create the state map that includes the API key, userId, email, and other details
      const stateMap = {
        apiKey: apiKey,
        metadataType: metadataType,
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: encodedRedirectUri,
        userid: userid, // Include the userId here
        email: userEmail, // Include the userEmail here
      };

      const stateJson = JSON.stringify(stateMap);
      const stateParam = btoa(stateJson); // Encode the state parameter

      let scopes;
      let authorizationUrl;
      let authorizationURLBase;

      // Determine the correct scopes and URL based on the metadata type
      if (metadataType.toLowerCase() === "data") {
        scopes = "data-service.admin project.content offline_access";
        authorizationURLBase = "https://marq.com/oauth2/authorizeAccount";
      } else {
        scopes = "project.templates project.content offline_access";
        authorizationURLBase = "https://marq.com/oauth2/authorize";
      }

      const encodedScopes = encodeURIComponent(scopes);

      // Construct the authorization URL
      authorizationUrl =
        `${authorizationURLBase}` +
        `?response_type=code` +
        `&client_id=${clientId}` +
        `&client_secret=${clientSecret}` +
        `&scope=${encodedScopes}` +
        `&redirect_uri=${encodedRedirectUri}` +
        `&state=${stateParam}`;

      return authorizationUrl;
    } catch (error) {
      console.error("Error generating authorization URL:", error.message);
      return null;
    }
  }

  // UPDATED createOrUpdateDataset FUNCTION v3
  const createOrUpdateDataset = async (refreshToken) => {
    const userId = context.user.id; // Get the user ID
  
    try {
      const clientid = process.env.CLIENT_ID;
      const clientsecret = process.env.CLIENT_SECRET;
  
      // Check if the dataset already exists
      const checkDatasetResponse = await hubspot.fetch({
        name: "fetchAccountTable",
        parameters: { objectType: objectType, userId: userId }, // Include userId in the parameters
      });
  
      accountResponseBody = JSON.parse(checkDatasetResponse.response.body);
  
      const accountData = accountResponseBody?.dataRow?.values || {};
      const matchedData = accountResponseBody?.objectTypeRow?.values || {};
  
      const marqAccountId = accountData?.accountId || null;
      datasetid = matchedData?.datasetid || null;
      collectionid = matchedData?.collectionid || null;
  
      if (datasetid && collectionid) {
        return; // Dataset already exists, exit
      } else {
        // Call the createDataset serverless function
        const createDatasetResponse = await hubspot.fetch({
          name: "createDataset",
          parameters: {
            refresh_token: refreshToken,
            clientid: clientid,
            marqAccountId: marqAccountId,
            clientsecret: clientsecret,
            objectName: objectType,
            schema: schema.map((item) => ({
              ...item,
              fieldType: item.fieldType.toString(), // Ensure fieldType is a string
            })),
          },
        });
  
        // Handle successful creation of the dataset
        if (createDatasetResponse?.response?.statusCode === 200) {
          const datasetResult = JSON.parse(createDatasetResponse.response.body);
          const new_refresh_token = datasetResult.new_refresh_token;
          datasetid = datasetResult.dataSourceId;
          collectionid = datasetResult.collectionId;
  
          // Update account refresh token with the new refresh token after success
          await hubspot.fetch({
            name: "updateAccountRefresh",
            parameters: {
              refreshToken: new_refresh_token || refreshToken, // Use new refresh token if available
              userId: userId, // Include userId
            },
          });
  
          await hubspot.fetch({
            name: "updateDataset",
            parameters: {
              objectType: objectType,
              datasetid: datasetid,
              collectionid: collectionid,
              userId: userId, // Include userId
            },
          });
        } else {
          console.error(
            `Failed to create dataset for ${objectType}:`,
            createDatasetResponse?.response?.body
          );
  
          await hubspot.fetch({
            name: "updateAccountRefresh",
            parameters: {
              refreshToken: "", // Set the refresh token to blank on error
              userId: userId, // Include userId
            },
          });
  
          throw new Error("Failed to create dataset.");
        }
      }
    } catch (error) {
      console.error("Error in createOrUpdateDataset:", error.message);
  
      // Handle general errors and set refresh token to blank
      await hubspot.fetch({
        name: "updateAccountRefresh",
        parameters: {
          refreshToken: "", // Set refresh token to blank on error
          userId: userId, // Include userId
        },
      });
    }
  };
  

  const handleCopy = async (text) => {
    try {
      await actions.copyTextToClipboard(text); // Use navigator.clipboard.writeText
      actions.addAlert({
        type: "success",
        message: "URL copied to clipboard.",
      });
    } catch (error) {
      console.error("Error copying text:", error);
      actions.addAlert({
        type: "warning",
        message: "Couldn't copy the URL.",
      });
    }
  };

  if (iframeLoading || isLoading) {
    return (
      <Flex direction="column" gap="medium" align="center">
        <LoadingSpinner label="Loading projects..." layout="centered" />
      </Flex>
    );
  }

  if (showTemplates) {
    return (
      <>
        {/* Account Token Button */}
        {showAccountTokenButton && (
          <LoadingButton
            href={accountoauthUrl}
            loading={isLoading} // Use isLoading to control the spinner
            variant="primary"
            onClick={() => {
              startPollingForAccountRefreshToken();
            }}
          >
            {isLoading ? "Syncing..." : "Sync Marq account data"}
          </LoadingButton>
        )}

        <Form>
          <Flex direction="row" justify="center" gap="small">
            <Box flex={1}>
              <Input
                type="text"
                placeholder="⌕ Search all templates"
                value={searchTerm}
                onInput={handleSearch}
                style={{ width: "100%" }}
              />
            </Box>
          </Flex>

          <Divider />

          <Flex direction="column" align="start" gap="small">
            <Box />
            <Box>
              <Text format={{ fontWeight: "bold" }}>{title}</Text>
            </Box>
          </Flex>
        </Form>

        <Table
          paginated
          page={currentPage}
          pageCount={totalPages}
          maxVisiblePageButtons={5}
          showButtonLabels
          showFirstLastButtons={false}
          onPageChange={handlePageChange}
        >
          <TableBody>
            {paginatedTemplates.map((template, index) => {
              const matchingProject = projects.find(
                (project) => project.originaltemplateid === template.id
              );

              return matchingProject ? (
                <TableRow key={matchingProject.objectId || index}>
                  <TableCell>
                    <Image
                      alt="File Preview"
                      src={`https://app.marq.com/documents/thumb/${matchingProject.projectid}/0/2048/NULL/400`}
                      onClick={() =>
                        editClick(
                          matchingProject.projectid,
                          matchingProject.fileid,
                          matchingProject.encodedoptions
                        )
                      }
                      preventDefault
                      width={100}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href="#"
                      onClick={() =>
                        editClick(
                          matchingProject.projectid,
                          matchingProject.fileid,
                          matchingProject.encodedoptions
                        )
                      }
                      preventDefault
                      variant="primary"
                    >
                      {matchingProject.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDate(matchingProject.hs_lastmodifieddate)}
                  </TableCell>
                  <TableCell>
                    <ButtonRow disableDropdown={false}>
                      <Button
                        onClick={() =>
                          editClick(
                            matchingProject.projectid,
                            matchingProject.fileid,
                            matchingProject.encodedoptions
                          )
                        }
                      >
                        Open
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          console.log(
                            "URL to be copied:",
                            matchingProject.fileurl
                          ); // Log the URL
                          handleCopy(matchingProject.fileurl);
                        }}
                      >
                        Copy Published URL
                      </Button>
                      <CrmActionButton
                        actionType="EXTERNAL_URL"
                        actionContext={{ href: matchingProject.fileurl }}
                        variant="secondary"
                      >
                        Go to PDF
                      </CrmActionButton>
                      <CrmActionButton
                        actionType="SEND_EMAIL"
                        actionContext={{
                          objectTypeId: context.crm.objectTypeId,
                          objectId: context.crm.objectId,
                        }}
                        variant="secondary"
                        onClick={() => {
                          actions.addAlert({
                            type: "info",
                            message:
                              "You can now send the email with the copied URL.",
                          });
                        }}
                      >
                        Send Email
                      </CrmActionButton>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          deleteRecord(matchingProject.objectId, "projects")
                        }
                      >
                        Delete
                      </Button>
                    </ButtonRow>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={template.id || index}
                  onClick={() =>
                    setSelectedRow(selectedRow === index ? null : index)
                  }
                >
                  <TableCell>
                    <Image
                      alt="Template Preview"
                      src={`https://app.marq.com/documents/thumb/${template.id}/0/2048/NULL/400`}
                      onClick={() => handleClick(template)}
                      preventDefault
                      width={100}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href="#"
                      onClick={() => handleClick(template)}
                      preventDefault
                      variant="primary"
                    >
                      {template.title}
                    </Link>
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <LoadingButton
                      loading={loadingTemplateId === template.id}
                      size="large"
                      onClick={() => {
                        setLoadingTemplateId(template.id);
                        handleClick(template);
                      }}
                    >
                      {loadingTemplateId === template.id
                        ? "Saving..."
                        : "Create"}
                    </LoadingButton>

                    {/* Cancel Button */}
                    {loadingTemplateId === template.id && (
                      <Button
                        variant="destructive"
                        size="small"
                        onClick={() => {
                          setLoadingTemplateId(null);
                          setShouldPollForProjects({
                            isPolling: false,
                            templateId: null,
                          });
                        }}
                      >
                        X
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </>
    );
  } else {
    if (!currentRefreshToken) {
      return (
        <Button
          href={authurl}
          variant="primary"
          size="med"
          type="button"
          onClick={startPollingForRefreshToken}
        >
          Connect to Marq
        </Button>
      );
    }
  }
};
 
export default Extension;

// hubspot.extend(() => <Extension />);

// const Extension = () => {
//   return (
//     <>
//       <Text>
//         Congrats! You just deployed your first App card. What's next? Here are
//         some pointers to get you started:
//       </Text>
//       <List variant="unordered-styled">
//         <Link href="https://developers.hubspot.com/docs/platform/ui-components">
//           📖 Explore our library of UI components
//         </Link>
//         <Link href="www.developers.hubspot.com">
//           📖 Learn more about utilities to help you build better extensions
//         </Link>
//         <Link href="github.com/hubspot/ui-extensions-examples">
//           📖 Get inspired by private app code samples
//         </Link>
//          <Link href="https://ecosystem.hubspot.com/marketplace/apps/app-cards">
//           📖 Look at the Marketplace collection of apps that contain app cards
//         </Link>
//         <Link href="https://ecosystem.hubspot.com/marketplace/apps/app-cards">
//           ▶️ Find resources to learn more
//         </Link>
//         <Link href="https://developers.hubspot.com/slack">
//           ▶️ Connect with developers on #ui-extensions channel on developer Slack community
//         </Link>
//       </List>
//     </>
//   );
// };
