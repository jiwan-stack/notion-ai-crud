// Optimized List Notion databases under NOTION_PARENT_PAGE_ID

const NOTION_API_VERSION = "2025-09-03";
const NOTION_BASE_URL = "https://api.notion.com/v1";

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'databases_list';

// Optimized headers with compression support
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Accept-Encoding",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300", // 5 minutes browser cache
  "Vary": "Accept-Encoding",
};

// Connection pool for HTTP requests
const httpAgent = new (require('http').Agent)({
  keepAlive: true,
  maxSockets: 10,
  timeout: 10000,
});

const httpsAgent = new (require('https').Agent)({
  keepAlive: true,
  maxSockets: 10,
  timeout: 10000,
});

// Optimized fetch with connection pooling
async function optimizedFetch(url, options = {}) {
  const fetchOptions = {
    ...options,
    agent: url.startsWith('https:') ? httpsAgent : httpAgent,
    headers: {
      'User-Agent': 'Notion-CRUD-App/1.0',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      ...options.headers,
    },
  };

  return fetch(url, fetchOptions);
}

// Cache management
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Parallel database enrichment with concurrency control
async function enrichDatabases(databases, notionApiKey, concurrency = 5) {
  const enriched = [];
  const chunks = [];
  
  // Split databases into chunks for parallel processing
  for (let i = 0; i < databases.length; i += concurrency) {
    chunks.push(databases.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (db) => {
      try {
        const dbRes = await optimizedFetch(`${NOTION_BASE_URL}/databases/${db.id}`, {
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Notion-Version": NOTION_API_VERSION,
          },
        });

        if (dbRes.ok) {
          const dbJson = await dbRes.json();
          
          // Optimized data processing
          const hasMultipleDataSources = dbJson.data_sources?.length > 1;
          const title = db.title || 
            dbJson.title?.[0]?.plain_text || 
            "Untitled";

          // In API 2025-09-03, properties are not returned in the database call
          // We need to get them from the data source
          let properties = [];
          if (dbJson.data_sources && dbJson.data_sources.length > 0) {
            try {
              const dataSourceId = dbJson.data_sources[0].id;
              const dataSourceRes = await optimizedFetch(`${NOTION_BASE_URL}/data_sources/${dataSourceId}`, {
                headers: {
                  Authorization: `Bearer ${notionApiKey}`,
                  "Notion-Version": NOTION_API_VERSION,
                },
              });
              
              if (dataSourceRes.ok) {
                const dataSourceJson = await dataSourceRes.json();
                properties = Object.keys(dataSourceJson.properties || {});
              }
            } catch (error) {
              console.warn(`Failed to get properties for database ${db.id}:`, error.message);
            }
          }

          return {
            id: db.id,
            title,
            url: dbJson.url,
            last_edited_time: dbJson.last_edited_time,
            created_time: dbJson.created_time,
            properties,
            hasMultipleDataSources,
            dataSources: dbJson.data_sources || [],
            // Backward compatibility for single data source
            ...(hasMultipleDataSources ? {} : {
              dataSourceId: dbJson.data_sources?.[0]?.id || db.id,
            }),
          };
        } else {
          return { id: db.id, title: db.title || "Untitled" };
        }
      } catch (error) {
        console.warn(`Failed to enrich database ${db.id}:`, error.message);
        return { id: db.id, title: db.title || "Untitled" };
      }
    });

    const chunkResults = await Promise.allSettled(promises);
    enriched.push(...chunkResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
    );
  }

  return enriched;
}

export async function handler(event) {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Check cache first
  const cachedResult = getCachedData(CACHE_KEY);
  if (cachedResult) {
    console.log(`Cache hit for databases list (${Date.now() - startTime}ms)`);
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'X-Cache': 'HIT',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
      body: JSON.stringify(cachedResult),
    };
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  // Environment validation
  if (!notionApiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "NOTION_API_KEY is not configured" }),
    };
  }

  if (!parentPageId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "NOTION_PARENT_PAGE_ID is not configured",
      }),
    };
  }

  try {
    console.log(`Starting database fetch (${Date.now() - startTime}ms)`);
    
    // Optimized pagination with parallel processing
    let results = [];
    let nextCursor = undefined;
    let pageCount = 0;
    const maxPages = 50; // Safety limit

    do {
      const childrenRes = await optimizedFetch(
        `${NOTION_BASE_URL}/blocks/${parentPageId}/children${
          nextCursor ? `?start_cursor=${encodeURIComponent(nextCursor)}` : ""
        }`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Notion-Version": NOTION_API_VERSION,
          },
        }
      );

      if (!childrenRes.ok) {
        const err = await childrenRes.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${childrenRes.status}`);
      }

      const children = await childrenRes.json();
      const childDatabases = (children.results || [])
        .filter((b) => b.type === "child_database" && b.child_database && b.id)
        .map((b) => ({ id: b.id, title: b.child_database.title }));

      results = results.concat(childDatabases);
      nextCursor = children.has_more ? children.next_cursor : undefined;
      pageCount++;

      // Safety check to prevent infinite loops
      if (pageCount >= maxPages) {
        console.warn(`Reached maximum page limit (${maxPages})`);
        break;
      }
    } while (nextCursor);

    console.log(`Found ${results.length} databases in ${pageCount} pages (${Date.now() - startTime}ms)`);

    // Parallel enrichment with optimized concurrency
    const enriched = await enrichDatabases(results, notionApiKey, 5);

    const responseData = {
      success: true,
      count: enriched.length,
      results: enriched,
      cached_at: new Date().toISOString(),
    };

    // Cache the result
    setCachedData(CACHE_KEY, responseData);

    const totalTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'X-Cache': 'MISS',
        'X-Response-Time': `${totalTime}ms`,
        'X-Database-Count': enriched.length.toString(),
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Database fetch failed after ${totalTime}ms:`, error.message);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'X-Response-Time': `${totalTime}ms`,
      },
      body: JSON.stringify({
        error: "Failed to list databases",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
}
