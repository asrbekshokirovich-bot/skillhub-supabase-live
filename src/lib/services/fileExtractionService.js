import mammoth from 'mammoth';

export const fileExtractionService = {
  /**
   * Extracts data from a File object based on its extension.
   * Returns a structured payload object that AI task service can consume.
   */
  async extractDataFromFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    try {
      if (extension === 'pdf') {
        return await this.extractFromPdf(file);
      } else if (extension === 'docx') {
        return await this.extractFromDocx(file);
      } else if (['txt', 'md', 'csv'].includes(extension)) {
        return await this.extractFromText(file);
      } else {
        throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      console.error("Extraction error:", error);
      throw new Error(`Failed to extract data from ${file.name}: ${error.message}`);
    }
  },

  async extractFromText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ type: 'text', data: e.target.result });
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  },

  async extractFromDocx(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { type: 'text', data: result.value };
  },

  async extractFromPdf(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // e.target.result is a data URL: "data:application/pdf;base64,JVBERi0..."
        // We just need the base64 part.
        const base64Data = e.target.result.split(',')[1];
        resolve({
          type: 'pdf',
          data: base64Data,
          mimeType: 'application/pdf'
        });
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Fetches URL via a public CORS proxy and extracts raw text
   */
  async extractTextFromUrl(url) {
    try {
      // Validate URL
      new URL(url); 
      
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Basic HTML text extraction
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove scripts and styles
      const scriptsAndStyles = doc.querySelectorAll('script, style, noscript, iframe, link, meta, nav, footer, header');
      scriptsAndStyles.forEach(el => el.remove());
      
      // Get text content
      const textContent = doc.body.textContent || "";
      // Clean up whitespace
      const cleaned = textContent.replace(/\s+/g, ' ').trim();
      return { type: 'text', data: cleaned };
      
    } catch (error) {
      console.error("URL Extraction error:", error);
      throw new Error(`Failed to read URL: ${error.message}`);
    }
  }
};
