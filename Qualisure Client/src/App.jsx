import { useState } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    
    // Check if the file is a PDF
    if (!selectedFile.type.includes("pdf")) {
      setError("Please upload a PDF file");
      return false;
    }
    
    // Clear previous errors
    setError(null);
    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const upload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await axios.post("http://localhost:3001/upload", formData);
      setResult(res.data);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || "Failed to upload and process document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">📄 Upload a Document</h1>
        
        <div className="mb-4">
          <input 
            type="file" 
            onChange={handleFileChange} 
            accept=".pdf"
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100"
          />
          {file && <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <button 
          onClick={upload} 
          disabled={!file || loading}
          className={`w-full px-4 py-2 rounded font-medium ${
            !file || loading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? "Processing..." : "Upload & Categorize"}
        </button>

        {loading && (
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {result && !loading && (
          <div className="mt-6 bg-green-100 p-4 rounded">
            <h2 className="font-bold text-green-800 mb-2">Document Processed!</h2>
            <p><strong>File:</strong> {result.fileName}</p>
            <p><strong>Category:</strong> {result.category}</p>
            <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%</p>
            <a 
              href={result.url} 
              className="mt-2 inline-block text-blue-600 hover:text-blue-800 underline" 
              target="_blank"
              rel="noopener noreferrer"
            >
              View Document
            </a>
          </div>
        )}
      </div>
    </div>
  );
}