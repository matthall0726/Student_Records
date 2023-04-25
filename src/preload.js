// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge } = require('electron');

const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('src/Database.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS user_reg (
      student_id INT NOT NULL PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      address VARCHAR(100) NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      email VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      password VARCHAR(100) NOT NULL
    )
  `);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      course_id INT NOT NULL PRIMARY KEY,
      course_name VARCHAR(50) NOT NULL,
      instructor_name VARCHAR(50) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      course_description VARCHAR(200) NOT NULL
    )
  `);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS enrollment (
      enrollment_id INT NOT NULL PRIMARY KEY,
      student_id INT NOT NULL,
      course_id INT NOT NULL,
      grade VARCHAR(2) NOT NULL,
      FOREIGN KEY (student_id) REFERENCES user_reg(student_id),
      FOREIGN KEY (course_id) REFERENCES courses(course_id)
    )
  `);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS schedule (
      schedule_id INT NOT NULL PRIMARY KEY,
      student_id INT NOT NULL,
      course_id INT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      room_number VARCHAR(20) NOT NULL,
      FOREIGN KEY (student_id) REFERENCES user_reg(student_id),
      FOREIGN KEY (course_id) REFERENCES courses(course_id)
    )
  `);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS department (
      department_id INT NOT NULL PRIMARY KEY,
      department_name VARCHAR(50) NOT NULL
    )
  `);
});

db.serialize(() => {
  db.run(`
  CREATE TABLE IF NOT EXISTS professor (
    professor_id INT NOT NULL PRIMARY KEY,
    professor_name VARCHAR(50) NOT NULL,
    address VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email_address VARCHAR(100) NOT NULL
  )
  `);
});

contextBridge.exposeInMainWorld('myDB', {
  db: db
});

//Get Username and password

function dbGet(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

contextBridge.exposeInMainWorld('dbGet', {
  dbGet: dbGet
});

//To insert into table.

function insertUser(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        console.log('Inserted row with rowid');
        resolve();
      }
    });
  });
}

contextBridge.exposeInMainWorld('insertUser', {
  insertUser: insertUser
});


function queryAll(tableName) {
  return new Promise((resolve, reject) => {
    let sqlString = '';
    if (tableName === 'user_reg') {
      sqlString = 'SELECT * FROM user_reg';
    } else if (tableName === 'courses') {
      sqlString = 'SELECT * FROM courses';
    } else if (tableName === 'department') {
      sqlString = 'SELECT * FROM department';
    } else if (tableName === 'enrollment') {
      sqlString = 'SELECT * FROM enrollment'
    } else if (tableName === 'professor') {
      sqlString = 'SELECT * FROM professor'
    } else if (tableName === 'schedule') {
      sqlString = 'SELECT * FROM schedule'
    }
    db.all(sqlString, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const columns = [];
        db.all(`PRAGMA table_info(${tableName})`, [], (err, infoRows) => {
          if (err) {
            reject(err);
          } else {
            infoRows.forEach((row) => {
              columns.push(row.name);
            });
            resolve({ rows, columns });
          }
        });
      }
    });
  });
}

function insertIntoTable(tableName, values) {
  return new Promise((resolve, reject) => {
    const columns = Object.keys(values).join(', ');
    const placeholders = Object.keys(values).map(() => '?').join(', ');
    const sqlString = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    const valuesArr = Object.values(values);
    db.run(sqlString, valuesArr, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function updateTableRow(tableName, primaryKeyColumn, primaryKeyValue, data) {
  return new Promise((resolve, reject) => {
    const updateString = Object.keys(data).map((key) => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const sqlString = `UPDATE ${tableName} SET ${updateString} WHERE ${primaryKeyColumn} = ?`;
    console.log(sqlString);
    values.push(primaryKeyValue);
    db.run(sqlString, values, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(`Row updated in ${tableName}`);
      }
    });
  });
}




function queryOne(tableName, primaryKeyValue) {
  return new Promise((resolve, reject) => {
    let sqlString = '';
    let primaryKey = '';
    if (tableName === 'user_reg') {
      sqlString = `SELECT * FROM user_reg WHERE student_id = ?`;
      primaryKey = 'student_id';
    } else if (tableName === 'courses') {
      sqlString = `SELECT * FROM courses WHERE course_id = ?`;
      primaryKey = 'course_id';
    } else if (tableName === 'department') {
      sqlString = `SELECT * FROM department WHERE department_id = ?`;
      primaryKey = 'department_id';
    } else if (tableName === 'enrollment') {
      sqlString = `SELECT * FROM enrollment WHERE enrollment_id = ?`;
      primaryKey = 'enrollment_id';
    } else if (tableName === 'professor') {
      sqlString = `SELECT * FROM professor WHERE professor_id = ?`;
      primaryKey = 'professor_id';
    } else if (tableName === 'schedule') {
      sqlString = `SELECT * FROM schedule WHERE schedule_id = ?`;
      primaryKey = 'schedule_id';
    }
    db.get(sqlString, [primaryKeyValue], (err, row) => {
      if (err) {
        reject(err);
      } else {
        if (!row) {
          console.error(`Error: No row found with primary key "${primaryKeyValue}" in table "${tableName}".`);
        } else if (!row[primaryKey]) {
          console.error(`Error: Primary key "${primaryKey}" not found in row retrieved from table "${tableName}".`);
        } else {
          resolve(row);
        }
      }
    });
  });
}


function deleteTableRow(tableName, primaryKeyValue, primaryKeyColumn) {
  const sql = `DELETE FROM ${tableName} WHERE ${primaryKeyColumn} = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, [primaryKeyValue], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}



// Expose the queryDatabase() function to the renderer process
contextBridge.exposeInMainWorld('myAPI', {
  queryAll: queryAll,
  insertIntoTable: insertIntoTable,
  updateTableRow: updateTableRow,
  queryOne: queryOne,
  deleteTableRow: deleteTableRow


});

