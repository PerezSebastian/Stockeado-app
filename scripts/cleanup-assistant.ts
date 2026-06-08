import { cleanupAssistantData } from "../src/lib/assistant/cleanup";

async function main() {
  const result = await cleanupAssistantData();
  console.log("Assistant cleanup completed:", result);
}

main()
  .catch((error) => {
    console.error("Assistant cleanup failed:", error);
    process.exit(1);
  });
