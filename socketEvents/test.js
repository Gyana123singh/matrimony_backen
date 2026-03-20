// Quick test to verify socket event modules load correctly
const path = require("path");

console.log("Testing Socket Event Modules...\n");

try {
  console.log("✅ messageEvents.js...");
  require("./messageEvents");

  console.log("✅ interestEvents.js...");
  require("./interestEvents");

  console.log("✅ notificationEvents.js...");
  require("./notificationEvents");

  console.log("✅ visitorEvents.js...");
  require("./visitorEvents");

  console.log("✅ statusEvents.js...");
  require("./statusEvents");

  console.log("✅ adminEvents.js...");
  require("./adminEvents");

  console.log("✅ index.js...");
  require("./index");

  console.log("\n✨ All socket event modules loaded successfully!");
  process.exit(0);
} catch (error) {
  console.error("\n❌ Error loading modules:");
  console.error(error.message);
  console.error("\nStack:", error.stack);
  process.exit(1);
}
