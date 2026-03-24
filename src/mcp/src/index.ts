import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const TEMP_FILE_PREFIX = "/tmp/lunette_";

const server = new McpServer({
  name: "lunette",
  version: "0.1.0",
});

function openDeepLink(url: string): void {
  try {
    if (process.platform === "darwin") {
      execFileSync("open", [url]);
    } else if (process.platform === "linux") {
      execFileSync("xdg-open", [url]);
    } else if (process.platform === "win32") {
      execFileSync("cmd", ["/c", "start", "", url]);
    }
  } catch {
    // Lunette may not be installed — the deep link still gets returned
  }
}

server.tool(
  "visualize",
  "Render content (mermaid diagram, markdown, excalidraw) in the Lunette desktop viewer. " +
    "Writes content to a temp file and opens it in Lunette via deep link. " +
    "IMPORTANT: Always ask the user for confirmation before calling this tool — " +
    "describe what you intend to visualize and wait for approval.",
  {
    content: z.string().describe("The content to visualize — mermaid definition, markdown text, or excalidraw JSON"),
    contentType: z
      .enum(["mermaid", "markdown", "excalidraw"])
      .optional()
      .describe("Optional format hint. Lunette auto-detects, but a hint helps with ambiguous content"),
  },
  async ({ content }) => {
    const id = randomUUID();
    const tmpPath = `${TEMP_FILE_PREFIX}${id}.txt`;

    writeFileSync(tmpPath, content, "utf-8");

    const deepLink = `lunette://?file=${tmpPath}`;
    openDeepLink(deepLink);

    return {
      content: [
        {
          type: "text" as const,
          text: `Content sent to Lunette.\nDeep link: ${deepLink}`,
        },
      ],
    };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lunette MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
