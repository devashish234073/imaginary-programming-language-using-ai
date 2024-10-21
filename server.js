const express = require('express');
const http = require('http');
const path = require('path');
const { exec } = require('child_process');
const fs = require("fs");

models = [];
function populateModels() {
  exec('ollama list', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    const lines = stdout.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const parts = line.split(/\s+/);
        const modelName = parts[0];
        models.push(modelName);
      }
    }
    console.log("available models ", models);
  });
}
if (process.argv[2]) {
  models.push(process.argv[2]);
  console.log("overriding with only one model ", models);
} else {
  populateModels();
}

const app = express();
const PORT = 9999;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/models', (req, res) => {
  res.end(JSON.stringify(models));
});

app.post('/predictOutput', (req, res) => {
  const code = req.body.code;
  const MODEL = req.body.model;
  const postData = JSON.stringify({
    model: MODEL,
    prompt: "This is an imaginary programming language code I am sending you, gues its output share just the output without any explanation " + code
  });

  askAI(postData,res);
});

function askAI(postData,res,obj) {
  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/api/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const apiReq = http.request(options, (apiRes) => {
    res.setHeader('Content-Type', 'text/plain');
    let aiResp = "";
    apiRes.on('data', (chunk) => {
      if(!obj) {
        res.write(chunk);
      } else {
        try {
          let chunkParsed = JSON.parse(chunk);
          aiResp+=chunkParsed.response;
        } catch(e) {

        }
      }
    });

    apiRes.on('end', () => {
      if(!obj) {
        res.end();
      } else {
        obj["aiResp"] = aiResp;
        res.end(JSON.stringify(obj));
      }
    });
  });

  apiReq.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    res.status(500).send('Internal Server Error');
  });

  apiReq.write(postData);
  apiReq.end();
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
