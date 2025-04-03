// electron/file-utils.js
const fs = require('fs');
const path = require('path');

// Save file
async function saveFile(filePath, content) {
  try {
    // Check if content is a base64 string (from binary file)
    if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/=]+$/)) {
      // Convert base64 to buffer
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      // Regular text content
      fs.writeFileSync(filePath, content);
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
}

// Read file
async function readFile(filePath, binary = false) {
  try {
    if (binary) {
      // Read as binary data (Buffer)
      const content = fs.readFileSync(filePath);
      // Convert Buffer to base64 for IPC transfer
      return {
        success: true,
        content: content.toString('base64'),
        isBinary: true
      };
    } else {
      // Read as UTF-8 text
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Read file as buffer (for ID3 tag reading)
async function readFileAsBuffer(filePath) {
  try {
    // Read file as buffer
    const buffer = fs.readFileSync(filePath);
    // Return the buffer as base64 string
    return {
      success: true,
      buffer: buffer.toString('base64')
    };
  } catch (error) {
    console.error('Error reading file as buffer:', error);
    return { success: false, error: error.message };
  }
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Join paths
function joinPaths(basePath, ...paths) {
  return path.join(basePath, ...paths);
}

// Save pipeline state to file
async function savePipelineStateToFile(pipelineState, userDataPath) {
  try {
    // Skip saving if pipeline state is empty
    if (!pipelineState || !Array.isArray(pipelineState) || pipelineState.length === 0) {
      return { success: false, error: 'Empty pipeline state' };
    }
    
    // Use path.join for cross-platform compatibility
    const filePath = path.join(userDataPath, 'pipeline-state.json');
    
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    // Save pipeline state to file
    fs.writeFileSync(filePath, JSON.stringify(pipelineState, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save pipeline state to file:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  saveFile,
  readFile,
  readFileAsBuffer,
  fileExists,
  joinPaths,
  savePipelineStateToFile
};