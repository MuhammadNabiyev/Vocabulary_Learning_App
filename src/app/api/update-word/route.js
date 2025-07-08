import fs from "fs";
import path from "path";

export async function POST(request) {
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify({
          error: "Invalid content type",
        }),
        {
          status: 400,
          headers,
        }
      );
    }

    const { word, isLearn } = await request.json();

    if (!word || typeof isLearn !== "boolean") {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid fields",
        }),
        {
          status: 400,
          headers,
        }
      );
    }

    const jsonsDir = path.join(process.cwd(), "jsons");

    if (!fs.existsSync(jsonsDir)) {
      return new Response(
        JSON.stringify({
          error: "Directory not found",
          details: `Looking in: ${jsonsDir}`,
        }),
        {
          status: 404,
          headers,
        }
      );
    }

    const jsonFiles = fs
      .readdirSync(jsonsDir)
      .filter((file) => file.endsWith(".json"));

    if (jsonFiles.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No JSON files found",
        }),
        {
          status: 404,
          headers,
        }
      );
    }

    let wordFound = false;
    let updatedFiles = [];

    for (const file of jsonFiles) {
      const filePath = path.join(jsonsDir, file);

      try {
        const content = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(content);

        if (!Array.isArray(data)) {
          console.warn(`Skipping ${file} - not an array`);
          continue;
        }

        const updatedData = data.map((item) => {
          if (item.word === word) {
            wordFound = true;
            return { ...item, isLearn };
          }
          return item;
        });

        if (wordFound) {
          fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
          updatedFiles.push(file);
          break;
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        continue;
      }
    }

    if (!wordFound) {
      return new Response(
        JSON.stringify({
          error: `Word "${word}" not found`,
        }),
        {
          status: 404,
          headers,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        word,
        isLearn,
        updatedFiles,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}
