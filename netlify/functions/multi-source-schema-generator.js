import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { zodToJsonSchema } from "@alcyone-labs/zod-to-json-schema";

const NOTION_API_VERSION = "2022-06-28";

// Zod schema for multi-source database structure
const MultiSourceDatabaseSchema = z.object({
  title: z.string().min(1, "Database title is required"),
  description: z.string().optional(),
  dataSources: z.array(
    z.object({
      name: z.string().min(1, "Data source name is required"),
      description: z.string().optional(),
      properties: z.record(
        z.string(),
        z.object({
          title: z.object({}).optional(),
          rich_text: z.object({}).optional(),
          number: z
            .object({
              format: z
                .enum([
                  "number",
                  "percent",
                  "dollar",
                  "euro",
                  "pound",
                  "yen",
                  "ruble",
                  "rupee",
                  "won",
                  "yuan",
                ])
                .optional(),
            })
            .optional(),
          select: z
            .object({
              options: z.array(
                z.object({
                  name: z.string(),
                  color: z
                    .enum([
                      "default",
                      "gray",
                      "brown",
                      "orange",
                      "yellow",
                      "green",
                      "blue",
                      "purple",
                      "pink",
                      "red",
                    ])
                    .optional(),
                })
              ),
            })
            .optional(),
          multi_select: z
            .object({
              options: z.array(
                z.object({
                  name: z.string(),
                  color: z
                    .enum([
                      "default",
                      "gray",
                      "brown",
                      "orange",
                      "yellow",
                      "green",
                      "blue",
                      "purple",
                      "pink",
                      "red",
                    ])
                    .optional(),
                })
              ),
            })
            .optional(),
          date: z.object({}).optional(),
          people: z.object({}).optional(),
          files: z.object({}).optional(),
          checkbox: z.object({}).optional(),
          url: z.object({}).optional(),
          email: z.object({}).optional(),
          phone_number: z.object({}).optional(),
          created_time: z.object({}).optional(),
          created_by: z.object({}).optional(),
          last_edited_time: z.object({}).optional(),
          last_edited_by: z.object({}).optional(),
        })
      ),
    })
  ),
});

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
    const {
      message,
      context: userContext,
      existingDatabases,
      individual_schemas,
      availableTemplates,
    } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message is required" }),
      };
    }

    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API key not configured" }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try multiple models with fallback
    const models = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
    let model = null;
    let lastError = null;

    for (const modelName of models) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        break; // If we get here, the model is available
      } catch (error) {
        console.log(`Model ${modelName} not available, trying next...`);
        lastError = error;
        continue;
      }
    }

    if (!model) {
      throw new Error(`No available models. Last error: ${lastError?.message}`);
    }

    // Convert templates to data source format if needed
    let convertedTemplates = [];
    if (availableTemplates && availableTemplates.length > 0) {
      convertedTemplates = availableTemplates.map(template => ({
        id: template.id,
        title: template.title,
        description: template.description,
        properties: template.properties,
        propertyCount: template.propertyCount,
        // Convert template to data source format
        asDataSource: {
          name: template.title,
          description: template.description,
          properties: template.properties
        }
      }));
    }

    // Create system prompt for multi-source database schema generation
    const systemPrompt = `You are an AI assistant specialized in creating Notion multi-source database schemas. Your role is to:

1. Understand user requirements for a complex system that needs multiple data sources
2. Generate comprehensive multi-source database schemas with appropriate property types
3. Design logical data source separation and relationships
4. Provide clear explanations of the multi-source architecture

NOTION MULTI-SOURCE DATABASE CONCEPTS:
- A single database can contain multiple data sources
- Each data source has its own set of pages and properties
- Data sources can represent different entities (e.g., Tasks, Projects, People)
- All data sources share the same database-level permissions
- Views can be linked to specific data sources

Available Notion property types:
- title: Main title field (required, only one per database)
- rich_text: Text with formatting
- number: Numeric values
- select: Single choice from predefined options
- multi_select: Multiple choices from predefined options
- date: Date and time values
- people: Notion users
- files: File attachments
- checkbox: Boolean true/false
- url: Web links
- email: Email addresses
- phone_number: Phone numbers
- formula: Calculated values
- relation: Links to other databases
- rollup: Aggregate data from relations
- created_time: Auto timestamp when created
- created_by: Auto user who created
- last_edited_time: Auto timestamp when modified
- last_edited_by: Auto user who last edited

IMPORTANT: You must return a valid JSON schema that matches the multi-source database format exactly. The response must be parseable JSON that follows this structure:

{
  "title": "Database Title",
  "description": "Database description",
  "dataSources": [
    {
      "name": "Data Source Name",
      "description": "Data source description",
        "properties": {
          "Property Name": {
            "title": {} // or other property type
          }
        }
    }
  ]
}

Property types and their configurations (use these exact formats):
- title: {"title": {}}
- rich_text: {"rich_text": {}}
- number: {"number": {"format": "number"}}
- select: {"select": {"options": [{"name": "Option 1", "color": "blue"}, {"name": "Option 2", "color": "green"}]}}
- multi_select: {"multi_select": {"options": [{"name": "Tag 1", "color": "green"}, {"name": "Tag 2", "color": "purple"}]}}
- date: {"date": {}}
- people: {"people": {}}
- files: {"files": {}}
- checkbox: {"checkbox": {}}
- url: {"url": {}}
- email: {"email": {}}
- phone_number: {"phone_number": {}}
- created_time: {"created_time": {}}
- created_by: {"created_by": {}}
- last_edited_time: {"last_edited_time": {}}
- last_edited_by: {"last_edited_by": {}}

IMPORTANT: For select and multi_select fields, use VARIED colors for different options. Available colors: gray, brown, orange, yellow, green, blue, purple, pink, red. Choose colors that make semantic sense (e.g., "Completed" = green, "In Progress" = blue, "Cancelled" = red).

CRITICAL: Each property in the properties object must have exactly one of these property types. Do not leave properties empty. Always specify the property type.

REQUIRED SCHEMA STRUCTURE (automatically generated from Zod schema):
${JSON.stringify(
  zodToJsonSchema(MultiSourceDatabaseSchema, {
    name: "MultiSourceDatabaseSchema",
  }),
  null,
  2
)}

This JSON Schema defines the exact structure your response must follow. Ensure your output matches this schema exactly.

MULTI-SOURCE DESIGN PRINCIPLES:
1. **Logical Separation**: Each data source should represent a distinct entity type
2. **Shared Properties**: Common properties across data sources should be consistent
3. **Relationships**: Consider how data sources might relate to each other
4. **Scalability**: Design for future growth and additional data sources
5. **User Experience**: Make it intuitive for users to understand the structure

COMMON MULTI-SOURCE PATTERNS:
- **Project Management**: Projects, Tasks, People, Resources
- **CRM System**: Contacts, Companies, Deals, Activities
- **Content Management**: Articles, Authors, Categories, Tags
- **Event Planning**: Events, Venues, Attendees, Vendors
- **E-commerce**: Products, Orders, Customers, Reviews

SPECIFIC CONTACT/CRM DATA SOURCE REQUIREMENTS:
When creating contact-related data sources, ensure they include these essential properties:
- **Contact Name**: {"title": {}} (required - main identifier)
- **Email**: {"email": {}} (for communication)
- **Phone**: {"phone_number": {}} (contact information)
- **Company**: {"rich_text": {}} (organization)
- **Status**: {"select": {"options": [{"name": "Active", "color": "green"}, {"name": "Inactive", "color": "gray"}, {"name": "Lead", "color": "blue"}]}}
- **Source**: {"select": {"options": [{"name": "Website", "color": "blue"}, {"name": "Referral", "color": "green"}, {"name": "Cold Call", "color": "orange"}]}}
- **Notes**: {"rich_text": {}} (additional information)
- **Last Contact**: {"date": {}} (when last contacted)
- **Created Date**: {"created_time": {}} (when record was created)

CRITICAL: Always include ALL properties in the data source. Do not leave properties empty or missing.

SPECIAL INSTRUCTIONS FOR INDIVIDUAL SCHEMAS:
If individual_schemas is true, generate individual database schemas as an ARRAY of separate schemas instead of a multi-source database. Each schema should be complete with title, description, and properties for that specific entity.

Example format for individual schemas:
[
  {
    "title": "Products Database",
    "description": "Product catalog management",
    "properties": {
      "Name": {"title": {}},
      "Price": {"number": {"format": "dollar"}}
    }
  },
  {
    "title": "Orders Database", 
    "description": "Order management system",
    "properties": {
      "Order ID": {"title": {}},
      "Customer Name": {"rich_text": {}}
    }
  }
]

When generating individual schemas:
- Return an ARRAY of schemas, not an object
- Each schema represents a separate database
- Each schema should have a single focus on one entity type
- Include all necessary properties for that entity
- Make each schema complete and functional on its own
- Use descriptive titles and consistent naming

When generating multi-source schemas (individual_schemas is false):
- Always include a title property as the first property in each data source
- Use appropriate property types for the data
- Include helpful descriptions for each data source
- Suggest realistic options for select/multi_select fields
- Consider relationships between different data sources
- Keep it practical and user-friendly
- AVOID relation properties unless you have actual database UUIDs
- Focus on standalone properties that don't require external references
- **CRITICAL**: Every data source MUST have properties. Do not create empty data sources.
- **CRITICAL**: Every property MUST have a valid property type configuration.
- **CRITICAL**: Contact/CRM data sources MUST include name, email, phone, company, status, and notes properties.

**MANDATORY FORMAT REQUIREMENT**: Your response MUST be in this exact format:
{
  "title": "System Title",
  "description": "System Description", 
  "dataSources": [
    {
      "name": "Data Source Name",
      "description": "Data Source Description",
      "properties": {
        "Property Name": {"property_type": {}},
        "Another Property": {"select": {"options": [{"name": "Option", "color": "blue"}]}}
      }
    }
  ]
}

**CRITICAL**: Do NOT return a single database schema with "properties" at the root level.
**CRITICAL**: You MUST return a multi-source schema with "dataSources" array.
**CRITICAL**: Each data source MUST have its own "properties" object.

${
  availableTemplates && availableTemplates.length > 0
    ? `AVAILABLE TEMPLATES:
${JSON.stringify(convertedTemplates, null, 2)}

IMPORTANT: When the user requests a system that matches any of these available templates, you should:
1. Use the matching template(s) as data sources directly
2. Include ALL template properties in the data sources
3. Use the template title as the data source name
4. Add the template description to the data source description
5. Ensure all template properties are included in the data source properties

Template to Data Source Conversion (ALREADY CONVERTED):
Each template has an "asDataSource" field that shows the exact format to use:

Template: {
  "title": "Project Management Hub",
  "description": "Complete project management system",
  "properties": {
    "Project Name": {"title": {}},
    "Status": {"select": {"options": [{"name": "Planning", "color": "gray"}]}}
  },
  "asDataSource": {
    "name": "Project Management Hub",
    "description": "Complete project management system", 
    "properties": {
      "Project Name": {"title": {}},
      "Status": {"select": {"options": [{"name": "Planning", "color": "gray"}]}}
    }
  }
}

Use the "asDataSource" format directly in your response.

CRITICAL: Always include ALL properties from the template. Do not leave any properties out.
CRITICAL: Copy the exact "asDataSource" object for each matching template.
CRITICAL: Do not modify or simplify the properties - use them exactly as provided.

**TEMPLATE USAGE EXAMPLE**: If user requests CRM system and you have Customer Relationship Manager template:
1. Take the "asDataSource" from the Customer Relationship Manager template
2. Use it directly as a data source in your response
3. Your response should look like:
{
  "title": "Customer Relationship Manager",
  "description": "Comprehensive CRM system for managing customer relationships and sales pipeline",
  "dataSources": [
    {
      "name": "Customer Relationship Manager",
      "description": "Comprehensive CRM system for managing customer relationships and sales pipeline",
      "properties": {
        "Company Name": {"title": {}},
        "Contact Person": {"rich_text": {}},
        "Email": {"email": {}},
        "Phone": {"phone_number": {}},
        "Status": {"select": {"options": [{"name": "Lead", "color": "yellow"}, {"name": "Qualified", "color": "blue"}]}},
        "Industry": {"select": {"options": [{"name": "Technology", "color": "blue"}]}},
        "Deal Value": {"number": {"format": "dollar"}},
        "Last Contact": {"date": {}},
        "Next Follow-up": {"date": {}},
        "Notes": {"rich_text": {}},
        "Website": {"url": {}}
      }
    }
  ]
}

`
    : ""
}

${
  existingDatabases
    ? `EXISTING DATABASES CONTEXT:
${JSON.stringify(existingDatabases, null, 2)}

Consider how the new multi-source database might relate to these existing databases.`
    : ""
}

Respond with:
1. A natural language explanation of the ${
      individual_schemas
        ? "individual database schemas"
        : "multi-source database structure"
    }
2. A detailed JSON schema ${
      individual_schemas
        ? "as an array of individual database schemas"
        : "following the exact multi-source format above"
    }

User request: ${message}
Individual schemas requested: ${individual_schemas}`;

    // Generate response with retry logic
    let result = null;
    let response = null;
    let text = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        result = await model.generateContent(systemPrompt);
        response = await result.response;
        text = response.text();
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.log(`Attempt ${retryCount} failed:`, error.message);

        if (retryCount >= maxRetries) {
          throw error; // Re-throw if we've exhausted retries
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Try to extract JSON schema from the response
    let schema = null;
    let explanation = text;

    console.log('Available templates:', availableTemplates);
    console.log('Converted templates:', convertedTemplates);
    console.log('Template count:', convertedTemplates.length);
    if (convertedTemplates.length > 0) {
      console.log('First template asDataSource:', convertedTemplates[0].asDataSource);
    }

    // First try to find JSON in code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsedSchema = JSON.parse(jsonMatch[1]);
        console.log('Parsed schema from code block: multi-source-schema-generator', JSON.stringify(parsedSchema, null, 2));
        // Validate the schema using Zod
        const validatedSchema = MultiSourceDatabaseSchema.parse(parsedSchema);
        schema = validatedSchema;
        explanation = text.substring(0, jsonMatch.index).trim();
      } catch (e) {
        console.error("Failed to parse or validate JSON schema:", e);
        // Try to find JSON without code blocks
        const directJsonMatch = text.match(/\{[\s\S]*\}/);
        if (directJsonMatch) {
          try {
            const parsedSchema = JSON.parse(directJsonMatch[0]);
            console.log('Parsed schema from direct JSON:', parsedSchema);
            const validatedSchema =
              MultiSourceDatabaseSchema.parse(parsedSchema);
            schema = validatedSchema;
            explanation = text.substring(0, directJsonMatch.index).trim();
          } catch (e2) {
            console.error("Failed to parse direct JSON:", e2);
          }
        }
      }
    } else {
      // Try to find JSON without code blocks
      const directJsonMatch = text.match(/\{[\s\S]*\}/);
      if (directJsonMatch) {
        try {
          const parsedSchema = JSON.parse(directJsonMatch[0]);
          console.log('Parsed schema from direct JSON (no code block):', parsedSchema);
          const validatedSchema = MultiSourceDatabaseSchema.parse(parsedSchema);
          schema = validatedSchema;
          explanation = text.substring(0, directJsonMatch.index).trim();
        } catch (e) {
          console.error("Failed to parse direct JSON:", e);
        }
      }
    }

    if (schema && schema.dataSources) {
      console.log('Data sources count:', schema.dataSources.length);
      schema.dataSources.forEach((ds, index) => {
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: explanation,
        schema: schema,
        type: individual_schemas ? "individual-schemas" : "multi-source",
        individual_schemas: individual_schemas || false,
      }),
    };
  } catch (error) {
    console.error("Error in multi-source-schema-generator function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
}
