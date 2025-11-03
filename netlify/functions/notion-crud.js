// Generic Notion CRUD Proxy Server
// Universal CRUD operations for any Notion database

export const config = {
  method: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

// Constants
const NOTION_API_VERSION = "2025-09-03";
const NOTION_BASE_URL = "https://api.notion.com/v1";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export default async function handler(request, context) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  const notionApiKey = process.env.NOTION_API_KEY;

  const url = new URL(request.url);
  const method = request.method;
  const recordId = url.searchParams.get("id");
  const databaseId =
    url.searchParams.get("database_id") || process.env.NOTION_DATABASE_ID;
  const dataSourceId = url.searchParams.get("data_source_id");

  if (!notionApiKey || !databaseId) {
    return createErrorResponse("Notion API key or Database ID missing", 500);
  }

  try {
    switch (method) {
      case "GET":
        if (recordId) {
          return await getRecord(recordId, notionApiKey);
        } else if (url.searchParams.get("info") === "true") {
          return await getDatabaseInfo(databaseId, notionApiKey);
        } else {
          return await getAllRecords(
            databaseId,
            notionApiKey,
            url.searchParams,
            dataSourceId
          );
        }

      case "POST":
        const createData = await request.json();
        return await createRecord(
          databaseId,
          createData,
          notionApiKey,
          dataSourceId
        );

      case "PUT":
        if (!recordId) {
          throw new Error("Record ID is required for updates");
        }
        const updateData = await request.json();
        return await updateRecord(recordId, updateData, notionApiKey);

      case "DELETE":
        if (!recordId) {
          throw new Error("Record ID is required for deletion");
        }
        return await deleteRecord(recordId, notionApiKey);

      default:
        throw new Error(`Method ${method} not allowed`);
    }
  } catch (error) {
    return createErrorResponse(error.message || "Operation failed", 500);
  }
}

// Helper function to create error responses
function createErrorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper function to create success responses
function createSuccessResponse(data, status = 200) {
  // Mask private fields before sending response
  const maskedData = maskPrivateFields(data);
  return new Response(JSON.stringify(maskedData), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper function to mask private fields marked with (Private)
function maskPrivateFields(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskPrivateFields(item));
  }

  const masked = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "properties" && value && typeof value === "object") {
      // Handle Notion properties specifically
      masked[key] = maskNotionProperties(value);
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskPrivateFields(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

// Helper function to mask Notion properties marked as (Private)
function maskNotionProperties(properties) {
  const masked = {};
  for (const [propName, propValue] of Object.entries(properties)) {
    if (propName.includes("(Private)")) {
      // Mask private fields based on their type
      masked[propName] = maskPrivateValue(propValue);
    } else {
      masked[propName] = propValue;
    }
  }
  return masked;
}

// Helper function to mask private values based on type
function maskPrivateValue(propValue) {
  if (!propValue || typeof propValue !== "object") {
    return propValue;
  }

  // Handle different Notion property types
  if (propValue.type === "email" && propValue.email) {
    return {
      ...propValue,
      email: "******@****.***",
    };
  }

  if (propValue.type === "phone_number" && propValue.phone_number) {
    return {
      ...propValue,
      phone_number: "+**-****-******",
    };
  }

  if (propValue.type === "number" && propValue.number !== null) {
    return {
      ...propValue,
      number: "+**-****-******",
    };
  }

  if (propValue.type === "rich_text" && propValue.rich_text) {
    return {
      ...propValue,
      rich_text: [{ text: { content: "***" } }],
    };
  }

  if (propValue.type === "title" && propValue.title) {
    return {
      ...propValue,
      title: [{ text: { content: "***" } }],
    };
  }

  if (propValue.type === "url" && propValue.url) {
    return {
      ...propValue,
      url: "https://***",
    };
  }

  // For other types, just mask the content
  return {
    ...propValue,
    content: "***",
  };
}

// Helper function to make Notion API calls
async function makeNotionRequest(endpoint, options = {}, notionApiKey) {
  // Build request options properly
  const requestOptions = {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": NOTION_API_VERSION,
      ...options.headers,
    },
  };

  // Only add body for POST/PUT/PATCH requests
  if (
    options.body &&
    ["POST", "PUT", "PATCH"].includes(requestOptions.method)
  ) {
    requestOptions.body = options.body;
  }

  const response = await fetch(`${NOTION_BASE_URL}${endpoint}`, requestOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Get database information
async function getDatabaseInfo(databaseId, notionApiKey) {
  
  const database = await makeNotionRequest(
    `/databases/${databaseId}`,
    {},
    notionApiKey
  );

  console.log('Raw database response from Notion API:', JSON.stringify(database, null, 2))

  console.log('Raw database response from Notion API:', database)

  // In API 2025-09-03, properties are not returned in the database call
  // We need to get them from the data source
  if (!database.properties && database.data_sources && database.data_sources.length > 0) {
    console.log('No properties in database, getting from data source')
    
    try {
      const dataSourceId = database.data_sources[0].id
      console.log('Querying data source for schema:', dataSourceId)
      
      // Get the data source schema
      const dataSourceSchema = await makeNotionRequest(
        `/data_sources/${dataSourceId}`,
        {},
        notionApiKey
      );
      
      console.log('Data source schema:', dataSourceSchema)
      
      if (dataSourceSchema.properties) {
        console.log('Found properties in data source:', Object.keys(dataSourceSchema.properties))
        database.properties = dataSourceSchema.properties
      } else {
        console.log('No properties found in data source schema')
        throw new Error('No properties found in data source schema')
      }
    } catch (error) {
      console.log('Failed to get properties from data source:', error.message)
      throw new Error(`Failed to get database properties: ${error.message}`)
    }
  } else if (database.properties) {
    console.log('Found properties in database schema:', Object.keys(database.properties))
  } else {
    console.log('No data sources found in database')
    throw new Error('No data sources found in database')
  }

  return createSuccessResponse({
    success: true,
    database: database,
  });
}

// Get all records from database or data source
async function getAllRecords(
  databaseId,
  notionApiKey,
  searchParams,
  dataSourceId
) {
  const page_size = parseInt(searchParams.get("page_size")) || 100;
  const start_cursor = searchParams.get("start_cursor");

  const body = { page_size };
  if (start_cursor) {
    body.start_cursor = start_cursor;
  }

  // Handle different API versions
  let endpoint;
  let actualDataSourceId = dataSourceId;

  if (!dataSourceId) {
    // Get database schema to determine the correct endpoint
    try {
      const schema = await makeNotionRequest(
        `/databases/${databaseId}`,
        {},
        notionApiKey
      );

      // Check if this API version supports data sources (API 2025-09-03)
      if (schema.data_sources && schema.data_sources.length > 0) {
        actualDataSourceId = schema.data_sources[0].id;
        endpoint = `/data_sources/${actualDataSourceId}/query`;
      } else {
        // API 2022-06-28 doesn't have data_sources, query database directly
        endpoint = `/databases/${databaseId}/query`;
      }

      // Check for archived property and add filter if it exists
      if (schema.properties && schema.properties.archived) {
        body.filter = {
          property: "archived",
          checkbox: { equals: false },
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to get data source from database: ${error.message}`
      );
    }
  } else {
    // Use provided data source ID
    endpoint = `/data_sources/${actualDataSourceId}/query`;
  }

  const data = await makeNotionRequest(
    endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    notionApiKey
  );

  return createSuccessResponse({
    success: true,
    results: data.results,
    has_more: data.has_more,
    next_cursor: data.next_cursor,
    dataSourceId: actualDataSourceId,
  });
}

// Get specific record
async function getRecord(recordId, notionApiKey) {
  const page = await makeNotionRequest(`/pages/${recordId}`, {}, notionApiKey);

  return createSuccessResponse({
    success: true,
    result: page,
  });
}

// Create new record
async function createRecord(
  databaseId,
  properties,
  notionApiKey,
  dataSourceId
) {
  // Handle different API versions for creating records
  let actualDataSourceId = dataSourceId;
  let parentObject;

  if (!dataSourceId) {
    // Get database schema to determine the correct parent object
    try {
      const schema = await makeNotionRequest(
        `/databases/${databaseId}`,
        {},
        notionApiKey
      );

      // Check if this API version supports data sources (API 2025-09-03)
      if (schema.data_sources && schema.data_sources.length > 0) {
        actualDataSourceId = schema.data_sources[0].id;
        parentObject = { data_source_id: actualDataSourceId };
      } else {
        // API 2022-06-28 doesn't have data_sources, use database directly
        parentObject = { database_id: databaseId };
      }
    } catch (error) {
      throw new Error(
        `Failed to get data source from database: ${error.message}`
      );
    }
  } else {
    // Use provided data source ID
    parentObject = { data_source_id: actualDataSourceId };
  }

  const page = await makeNotionRequest(
    "/pages",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent: parentObject,
        properties,
      }),
    },
    notionApiKey
  );

  return createSuccessResponse(
    {
      success: true,
      result: page,
      message: "Record created successfully",
      dataSourceId: actualDataSourceId,
    },
    201
  );
}

// Update record
async function updateRecord(recordId, properties, notionApiKey) {
  // Debug: log API version and outgoing body
  try {
    console.log('UpdateRecord called with:', {
      recordId,
      apiVersion: NOTION_API_VERSION,
      outgoingProperties: properties,
    })
  } catch {}

  const page = await makeNotionRequest(
    `/pages/${recordId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    },
    notionApiKey
  );

  // Debug: log Notion response summary
  try {
    console.log('UpdateRecord Notion response keys:', Object.keys(page || {}))
    console.log('UpdateRecord Notion properties (echo):', page?.properties)
  } catch {}

  return createSuccessResponse({
    success: true,
    result: page,
    message: "Record updated successfully",
  });
}

// Delete (archive) record
async function deleteRecord(recordId, notionApiKey) {
  await makeNotionRequest(
    `/pages/${recordId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    },
    notionApiKey
  );

  return createSuccessResponse({
    success: true,
    message: "Record deleted successfully",
  });
}
