app.get('/setupsuper', async (req, res) => {
    const salt = await bcrypt.genSalt(10);
  
    db.run('insert into users values (?,?,?,?,?)', ['jd4rider', 'Jonathan', 'Forrider', await bcrypt.hash("password", salt), 'admin'], function(err) {
      if (err) {
        return console.log(err.message);
      }
      // get the last insert id
      console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
  })