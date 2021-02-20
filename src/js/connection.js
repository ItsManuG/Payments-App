const mysql = require('mysql')

const database = mysql.createConnection({
    host: 'localhost',
    database: 'test',
    user: 'root',
    password: 'manu1234',
    port: 3306
})

function connectDatabase() {
    database.connect((err) => {
        return err ? console.log("Error connecting to database") : console.log("Connection succesfully stablished!")
    })
}

function queryExecution(query, callback) {
    const queryToExecute = query
    //console.log(queryToExecute)
    database.query(queryToExecute, (err, rows, fields) => {
        return err ? console.log('An error occurs with the query', err) : Object.keys(rows).length > 0 ? callback(rows) : console.log("User not founded")
    })
}

module.exports = {
    connectDatabase,
    queryExecution
}