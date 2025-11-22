const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialisation de la base de données
const db = new sqlite3.Database('./evaluations.db', (err) => {
  if (err) {
    console.error('Erreur connexion DB:', err);
  } else {
    console.log('✓ Base de données connectée');
  }
});

// Création de la table
db.run(`
  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semaine TEXT NOT NULL,
    eleveId INTEGER NOT NULL,
    eleveNom TEXT NOT NULL,
    type TEXT NOT NULL,
    engagement TEXT,
    comportement INTEGER,
    absent INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    UNIQUE(semaine, eleveId, type)
  )
`, (err) => {
  if (err) {
    console.error('Erreur création table:', err);
  } else {
    console.log('✓ Table créée/vérifiée');
  }
});

// Routes API

// GET - Récupérer toutes les évaluations
app.get('/api/evaluations', (req, res) => {
  db.all('SELECT * FROM evaluations ORDER BY semaine DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET - Récupérer les évaluations d'un élève
app.get('/api/evaluations/eleve/:eleveId', (req, res) => {
  const { eleveId } = req.params;
  db.all(
    'SELECT * FROM evaluations WHERE eleveId = ? ORDER BY semaine DESC',
    [eleveId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// POST - Créer/Mettre à jour une évaluation
app.post('/api/evaluations', (req, res) => {
  const { semaine, eleveId, eleveNom, type, engagement, comportement, absent, date } = req.body;

  // Vérifier si l'évaluation existe déjà
  db.get(
    'SELECT * FROM evaluations WHERE semaine = ? AND eleveId = ? AND type = ?',
    [semaine, eleveId, type],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (row) {
        // Mise à jour
        db.run(
          `UPDATE evaluations 
           SET engagement = ?, comportement = ?, absent = ?, date = ?
           WHERE semaine = ? AND eleveId = ? AND type = ?`,
          [engagement, comportement, absent || 0, date, semaine, eleveId, type],
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ id: row.id, updated: true });
          }
        );
      } else {
        // Insertion
        db.run(
          `INSERT INTO evaluations (semaine, eleveId, eleveNom, type, engagement, comportement, absent, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [semaine, eleveId, eleveNom, type, engagement, comportement, absent || 0, date],
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ id: this.lastID, created: true });
          }
        );
      }
    }
  );
});

// DELETE - Supprimer une évaluation (optionnel)
app.delete('/api/evaluations/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM evaluations WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Route pour servir l'application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📱 Accès local: http://localhost:${PORT}`);
});

// Gestion de la fermeture propre
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Base de données fermée');
    process.exit(0);
  });
});