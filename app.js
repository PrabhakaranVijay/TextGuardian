const express = require("express");
const { spawn } = require("child_process");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.post("/analyze", (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Please provide text to analyze" });
    }

    // Run Python script to analyze the text
    const pythonProcess = spawn("python3", ["analyze_text.py", content]);

    let pythonData = "";
    let pythonError = "";

    pythonProcess.stdout.on("data", (data) => {
        pythonData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        pythonError += data.toString();
    });

    pythonProcess.on("close", (code) => {
        if (code !== 0) {
            console.error("Python script error:", pythonError);
            return res.status(500).json({ error: "Error analyzing text", details: pythonError });
        }

        try {
            // Convert output string to JSON format
            const results = JSON.parse(pythonData);

            // Identify potential harmful labels
            let warning = null;
            const problematicLabels = results.filter(r => r.label !== "OK" && r.probability > 0.01);
            
            if (problematicLabels.length > 0) {
                warning = `Potential issues detected: ${problematicLabels.map(r => r.label).join(", ")}`;
            }

            return res.json({
                results: results,
                warning: warning,
            });
        } catch (error) {
            console.error("Error parsing results:", error);
            return res.status(500).json({ error: "Error processing analysis results" });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
