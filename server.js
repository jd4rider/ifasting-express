require("dotenv").config();
const bcrypt = require("bcrypt");
const express = require('express')
var cors = require('cors')
const app = express()
const port = process.env.PORT
const jwt = require('jsonwebtoken');
const mariadb = require('mariadb/callback');



const accessTokenSecret = 'youraccesstokensecret';

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
      const token = authHeader.split(' ')[1];

      jwt.verify(token, accessTokenSecret, (err, user) => {
          if (err) {
              return res.sendStatus(403);
          }

          req.user = user;
          next();
      });
  } else {
      res.sendStatus(401);
  }
};

app.use(cors())

app.use(express.json());

// let db = new sqlite3.Database('./db/test.db', (err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Connected to the database.');
// });
let localdbhost =
{
  host: process.env.MYSQL_HOST, 
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER, 
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB
}

let jawsdb;

if(process.env.JAWSDB_MARIA_URL) {
  jawsdb = process.env.JAWSDB_MARIA_URL
  jawsdb = jawsdb.replace('mysql', 'mariadb')
} else jawsdb = undefined;

let dbhost = jawsdb || `mariadb://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DB}`

let db = mariadb.createConnection(dbhost)

db.connect(function (err) {
  // Check if there is a connection error
  if (err) {
      console.log("connection error", err.stack);
      return;
  }

  // If there was no error, print this message
  console.log(`connected to database`);
});

app.post('/api/login', async (req, res) => {
  // Read username and password from request body
  const { username, password } = req.body;

  // Filter user from the users array by username and password
  db.query('select * from users where username = ?', [username], async function(err, row) {
    if (err) {
      return console.log(err.message);
    }
    if (row) {
      // check user password with hashed password stored in the database
      const validPassword = await bcrypt.compare(password, row[0].password);
      if (validPassword) {
        const token = jwt.sign({ username: row[0].username,  role: row[0].userrole }, accessTokenSecret);
        const username = row[0].username;
    
        res.status(200).json({
          token,
          username
        })
      } else {
        res.status(400).json({ error: "Invalid Password" });
      }
    } else {
      res.status(401).json({ error: "User does not exist" });
    }
  });
});


app.get('/signup', async (req, res) => {
  const salt = await bcrypt.genSalt(10);

  db.query('insert into users (username, fname, lname, password, userrole) values (?,?,?,?,?)', ['jd4rider', 'Jonathan', 'Forrider', await bcrypt.hash("password", salt), 'admin'], function(err, result) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with id ${result.insertId}`);
  });
})

app.post('/api/signup', async (req, res) => {
  const salt = await bcrypt.genSalt(10);
  const { username, password, fname, lname } = req.body;

  db.query('insert into users (username, fname, lname, password, userrole) values (?,?,?,?,?)', [username, fname, lname, await bcrypt.hash(password, salt), 'user'], function(err, result) {
    if (err) {
      if(err.message.includes('Duplicate')) return res.status(201).json({ error: "User Already Exists" });
      else return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with id ${result.insertId}`);
    db.query('select * from users where id = ?', [result.insertId], (err, rows) => {
      if(rows) {
        const token = jwt.sign({ username: rows[0].username,  role: rows[0].userrole }, accessTokenSecret);
        const username = rows[0].username;
    
        res.status(200).json({
          token,
          username
        })
      }
    })

  });
})

app.post('/api/tracker/start', authenticateJWT, async (req, res) => {
  console.log(req.body);
  const { username } = req.body;
  const starttime= new Date().toISOString().slice(0, 19).replace('T', ' ');
 
  db.query('select id from users where username = ?', [username], (err, rows) => {
    db.query('insert into tracker (starttime, userid) values (?,?)', [starttime, rows[0].id], function(err, result) {
      if (err) {
        return console.log(err.message);
      }
      // get the last insert id
      console.log(`A row has been inserted with id ${result.insertId}`);
      res.status(200).json({'hello':'allowed'})

    });
  });
})

app.put('/api/tracker/end', authenticateJWT, async (req, res) => {
  console.log(req.body);
  const { username } = req.body;
  const endtime = new Date().toISOString().slice(0, 19).replace('T', ' ');
 
  db.query('select id from users where username = ?', [username], (err, rows) => {
    db.query('update tracker set endtime = ? where userid = ? and trim(endtime) is null', [endtime, rows[0].id], function(err, result) {
      if (err) {
        return console.log(err.message);
      }
      // get the last insert id
      console.log(`A row has been updated at id ${result.insertId}`);
      res.status(200).json({'hello':'allowed'})

    });
  });
})

app.get('/api/tracker/get/all/:username', authenticateJWT,  async (req, res) => {
  const username = req.params.username || 'none';

  db.query('select id from users where username = ?', [username], (err, rows) => {
    db.query('select * from tracker where userid = ?', [rows[0].id], function(err, result) {
      if (err) {
        return console.log(err.message);
      }
      // get the last insert id
      res.status(200).json(result)

    });
  });
})

app.get('/api/tracker/get/unfinished/:username', authenticateJWT,  async (req, res) => {
  const username = req.params.username || 'none';
  const currdate = new Date().toISOString().slice(0, 19).replace('T', ' ');

  db.query('select id from users where username = ?', [username], (err, rows) => {
    db.query('select * from tracker where userid = ? and trim(endtime) is null', [rows[0].id], function(err, result) {
      if (err) {
        return console.log(err.message);
      }
      // get the last insert id
      var date1 = new Date(result[0].starttime)
      var date2 = new Date(currdate)

      var difference = date2.getTime()-date1.getTime();
      var hours = Math.floor((difference / (1000*60*60)) % 24)
      var hourselapsed = {hours : hours}
      var resultret = [{...result[0], ...hourselapsed}]
      res.status(200).json(resultret)

    });
  });
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


