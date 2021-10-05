const bcrypt = require("bcrypt");
const sqlite3 = require('sqlite3').verbose();
const express = require('express')
var cors = require('cors')
const app = express()
const port = 5000
const jwt = require('jsonwebtoken');



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

let db = new sqlite3.Database('./db/test.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});


app.post('/api/employees', authenticateJWT, (req, res) => {
  const {first_name, last_name, email, phone, address, address_two, city, state, zip, user_id, date_changed, date_added} = req.body;
  db.run('insert into employees (first_name, last_name, email, phone, address, address_two, city, state, zip, user_id, date_changed, date_added) values (?,?,?,?,?,?,?,?,?,?,?,?)', [first_name, last_name, email, phone, address, address_two, city, state, zip, user_id, date_changed, date_added], (err) => {
    if (err) {
      return console.log(err.message);
     }
     res.status(200).json({'hello':'allowed'})
  })

  
})


app.get('/api/employees', authenticateJWT,  (req, res) => {
  db.all('select * from employees', (err, json) => {
    if (err) {
      return console.log(err.message);
    }
    res.status(200).json(JSON.stringify(json))

  })
})

app.get('/api/triggers', authenticateJWT, (req, res) => {
  db.all(`select * from triggers where tusername = '${req.query.authuser}'`, (err, json) => {
    if (err) {
      return console.log(err.message);
    }
    res.status(200).json(JSON.stringify(json))

  })
})

app.post('/api/triggers', authenticateJWT, (req, res) => {
  const {tname, taction, tusername} = req.body;
  db.run('insert into triggers (tname, taction, tusername) values (?,?,?)', [tname, taction, tusername], (err) => {
    if (err) {
      return console.log(err.message);
     }
     res.status(200).json({'hello':'allowed'})
  }) 
})

app.put('/api/triggers', authenticateJWT, (req, res) => {
  const {tid, tname, taction, tusername} = req.body;
  db.run('update triggers set tname = ?, taction = ? where id = ? and tusername = ?', [tname, taction, tid, tusername], (err) => {
    if (err) {
      return console.log(err.message);
     }
     res.status(200).json({'hello':'allowed'})
  }) 
})

app.delete('/api/triggers', authenticateJWT, (req, res) => {
  console.log('deletehappening')
  const {tid, tusername} = req.body;
  db.run('delete from triggers where id = ? and tusername = ?', [tid, tusername], (err)=>{
    if (err) {
      return console.log(err.message);
    }
    res.status(200).json({'hello':'allowed'})
  })
})

app.post('/api/login', async (req, res) => {
  // Read username and password from request body
  const { username, password } = req.body;

  // Filter user from the users array by username and password
  db.get('select * from users where username = ?', [username], async function(err, row) {
    if (err) {
      return console.log(err.message);
    }
    if (row) {
      // check user password with hashed password stored in the database
      const validPassword = await bcrypt.compare(password, row.password);
      if (validPassword) {
        const token = jwt.sign({ username: row.username,  role: row.role }, accessTokenSecret);
        const username = row.username;
    
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


  // if (user) {
  //     // Generate an access token
  //     const accessToken = jwt.sign({ username: user.username,  role: user.role }, accessTokenSecret);

  //     res.json({
  //         accessToken
  //     });
  // } else {
  //     res.send('Username or password incorrect');
  // }
});


app.post('/signup', async (req, res) => {
  const salt = await bcrypt.genSalt(10);

  db.run('insert into users values (?,?,?,?,?)', ['jd4rider', 'Jonathan', 'Forrider', await bcrypt.hash("password", salt), 'admin'], function(err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
  });
})

app.post('/api/signup', async (req, res) => {
  const salt = await bcrypt.genSalt(10);
  const { username, password, fname, lname } = req.body;

  db.run('insert into users values (?,?,?,?,?)', [username, fname, lname, await bcrypt.hash(password, salt), 'admin'], function(err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
    db.get('select * from users where rowid = ?', [this.lastID], async function(err, row){
      if(row) {
        const token = jwt.sign({ username: row.username,  role: row.role }, accessTokenSecret);
        const username = row.username;
    
        res.status(200).json({
          token,
          username
        })
      }
    })

  });
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


