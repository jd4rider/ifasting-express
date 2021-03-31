const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('test.db');

db.serialize(()=>{
    db.run('drop table employees')

    db.run('CREATE TABLE employees(first_name, last_name, email, phone, address, address_two, city, state, zip, user_id, date_changed)');
})


db.close();