const express = require('express');
const cors = require('cors');
const path = require('path');
const DB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Retrieve full state initially
app.get('/api/state', (req, res) => {
  res.json(DB.loadData());
});

// Update state module
app.post('/api/save', (req, res) => {
  const { module, record, user, actionLog } = req.body;
  const data = DB.loadData();

  if (actionLog === 'created') {
    data[module].push(record);
    data.nextId[module] = data.nextId[module] + 1;
  } else if (actionLog === 'edited') {
    const idx = data[module].findIndex(x => x.id === record.id);
    if (idx > -1) {
      data[module][idx] = record;
    }
  }

  // add activity log
  const name = record.name || record.epName || record.company || 'Record';
  data.activity.unshift({
    user: user || 'User',
    action: actionLog,
    module: module.toUpperCase(),
    recordId: '#' + record.id,
    ts: new Date().toLocaleString()
  });

  DB.saveData(data);
  res.json({ success: true, nextId: data.nextId[module] });
});

app.post('/api/delete', (req, res) => {
  const { module, id, user } = req.body;
  const data = DB.loadData();

  const idx = data[module].findIndex(x => x.id === id);
  if (idx > -1) {
    const record = data[module][idx];
    const name = record.name || record.epName || record.company || 'Record';
    data[module].splice(idx, 1);
    
    data.activity.unshift({
      user: user || 'User',
      action: 'deleted',
      module: module.toUpperCase(),
      recordId: '#' + id,
      ts: new Date().toLocaleString()
    });
    
    DB.saveData(data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Proxy route for AIESEC GIS API to avoid CORS or store the exact token provided by user
app.post('/api/gis', async (req, res) => {
  try {
    const response = await fetch('https://gis-api.aiesec.org/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'VE4r4-4KeFDZxoNU0w4-cy8SxG4kFNzESfjbyAvMVcg', // Replaced token based on user request
      },
      body: JSON.stringify(req.body)
    });
    const result = await response.json();
    res.json(result);
  } catch(error) {
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
