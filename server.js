const fs = require("fs");
const path = require("path");

// cPanel/Passenger requires a startup file in the application root. Next.js
// with output: "standalone" must instead run its generated standalone server;
// this small launcher bridges both requirements.
const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

if (!fs.existsSync(standaloneServer)) {
  throw new Error("Build standalone tidak ditemukan. Jalankan `npm run build` sebelum memulai aplikasi.");
}

require(standaloneServer);
