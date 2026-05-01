import { fileExtractionService } from './src/lib/services/fileExtractionService.js';

async function run() {
  try {
    console.log("Testing URL extract...");
    const text = await fileExtractionService.extractTextFromUrl("https://example.com");
    console.log("Extracted length:", text.length);
    console.log("Extracted text snippet:", text.substring(0, 100));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
