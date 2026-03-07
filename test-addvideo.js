import { storage } from "./server/storage.js";
import { db } from "./server/db.js";

async function run() {
    try {
        const res = await storage.addVideo(1, "https://youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", "Test Video", "url", 100);
        console.log("Success:", res);
    } catch (err) {
        console.error("Error adding video:", err);
    }
    process.exit();
}
run();
