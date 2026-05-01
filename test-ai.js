import { aiTaskService } from './src/lib/services/aiTaskService.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    console.log("Testing aiTaskService with structured input...");
    // Mock the environment variable inside aiTaskService if needed
    // The service uses import.meta.env, which won't work in raw Node without Vite.
    // Let's monkey patch it for the test.
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
