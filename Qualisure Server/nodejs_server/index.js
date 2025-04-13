const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors"); // You'll need to install this: npm install cors
const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase
initializeApp({
  // storageBucket: "neurodocs-1e21a.firebasestorage.app", // Keep your original bucket name
});

const app = express();

// Add CORS middleware
app.use(cors());

const db = getFirestore();
const bucket = getStorage().bucket();
const upload = multer({ 
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    // Accept only PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Your specific Python path
const PYTHON_PATH = "C:\\Users\\aondi\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or invalid file type" });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;
  
  try {
    // Upload file to Firebase Storage
    await bucket.upload(filePath, { 
      destination: `documents/${fileName}`,
      metadata: {
        contentType: req.file.mimetype,
      }
    });
    
    // Generate a signed download URL
    const [url] = await bucket.file(`documents/${fileName}`).getSignedUrl({
      action: "read",
      expires: "03-09-2030",
    });
    
    // Run Python classification with the specific path
    const pythonScriptPath = path.join(__dirname, "../flaskPython/classify.py");
    
    console.log(`Running: ${PYTHON_PATH} ${pythonScriptPath} ${filePath}`);
    const python = spawn(PYTHON_PATH, [pythonScriptPath, filePath]);
    
    let resultData = "";
    python.stdout.on("data", (chunk) => {
      resultData += chunk.toString();
      console.log("Python stdout:", chunk.toString());
    });
    
    python.stderr.on("data", (err) => {
      console.error("Python error:", err.toString());
    });
    
    python.on("close", async (code) => {
      // Clean up the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
      
      console.log(`Python process exited with code ${code}`);
      
      if (code !== 0) {
        return res.status(500).json({ error: "Python process exited with error" });
      }
      
      try {
        // Add extra logging for debugging
        console.log("Raw Python output:", resultData);
        
        if (!resultData.trim()) {
          return res.status(500).json({ error: "No output from Python script" });
        }
        
        const result = JSON.parse(resultData);
        if (result.error) {
          return res.status(500).json({ error: result.error });
        }
        
        // Save to Firestore
        const docRef = await db.collection("documents").add({
          fileName,
          url,
          ...result,
          uploadedAt: new Date(),
        });
        
        res.json({ 
          id: docRef.id,
          fileName, 
          url, 
          category: result.category,
          confidence: result.confidence
        });
      } catch (e) {
        console.error("Failed to parse Python output:", e);
        res.status(500).json({ error: `AI classification failed: ${e.message}` });
      }
    });
    
    // Handle potential spawn errors
    python.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      res.status(500).json({ error: `Failed to start Python process: ${err.message}` });
    });
    
  } catch (error) {
    console.error("Upload Error:", error);
    
    // Clean up the temporary file on error
    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });
    
    res.status(500).json({ error: "Upload or classification failed." });
  }
});

app.listen(3001, () =>
  console.log("✅ Server running on http://localhost:3001")
);