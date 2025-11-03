import { Client } from "@notionhq/client";

const NOTION_API_VERSION = "2025-09-03";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

export async function handler(event, context) {
  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { schema, databaseId } = JSON.parse(event.body);

    if (!schema) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Schema is required" }),
      };
    }

    // Initialize Notion client
    const notionToken = process.env.NOTION_API_KEY;
    const parentPageId = databaseId || process.env.NOTION_PARENT_PAGE_ID;

    if (!notionToken) {
      console.error("NOTION_API_KEY is not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Notion API token not configured" }),
      };
    }

    if (!parentPageId) {
      console.error("No parent page ID provided and no default configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error:
            "Parent page ID is required. Please provide a page ID or set NOTION_PARENT_PAGE_ID in your environment variables.",
        }),
      };
    }

    const notion = new Client({ auth: notionToken });

    // Prepare database creation request
    const databaseData = {
      parent: {
        type: "page_id",
        page_id: parentPageId,
      },
      title: [
        {
          type: "text",
          text: {
            content: schema.title || "New Database",
          },
        },
      ],
      description: schema.description
        ? [
            {
              type: "text",
              text: {
                content: schema.description,
              },
            },
          ]
        : [],
      properties: {},
    };

    // Use schema properties directly (already in Notion format)
    if (schema.properties) {
      for (const [propertyName, propertyConfig] of Object.entries(
        schema.properties
      )) {
        databaseData.properties[propertyName] = propertyConfig;
      }
    }

    // Ensure there's at least one title property
    if (!hasTitle(databaseData.properties)) {
      databaseData.properties["Name"] = {
        title: {},
      };
    }

    console.log(
      "Creating database with data:",
      JSON.stringify(databaseData, null, 2)
    );

    // Create the database
    const response = await notion.databases.create(databaseData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: response.id,
        title: schema.title || "New Database",
        url: response.url,
        created_time: response.created_time,
        properties: Object.keys(response.properties),
      }),
    };
  } catch (error) {
    console.error("Error creating Notion database:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    // Handle specific Notion API errors
    if (error.code === "validation_error") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid database schema",
          details: error.message,
          code: error.code,
        }),
      };
    }

    if (error.code === "unauthorized") {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: "Unauthorized access to Notion API",
          details: "Please check your integration permissions and API key",
          code: error.code,
        }),
      };
    }

    if (error.code === "object_not_found") {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: "Database ID not found",
          details:
            "The provided database ID does not exist or you don't have access to it",
          code: error.code,
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to create database",
        message: error.message,
        code: error.code || "unknown",
        details: error.body || "No additional details available",
      }),
    };
  }
}

// Helper function to check if properties contain a title field
function hasTitle(properties) {
  return Object.values(properties).some((prop) => prop.title !== undefined);
}

// Helper function to validate schema structure
function validateSchema(schema) {
  if (!schema || typeof schema !== "object") {
    throw new Error("Schema must be a valid object");
  }

  if (!schema.title || typeof schema.title !== "string") {
    throw new Error("Schema must have a valid title");
  }

  if (schema.properties && typeof schema.properties !== "object") {
    throw new Error("Schema properties must be a valid object");
  }

  return true;
}
