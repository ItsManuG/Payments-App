const { dialog, BrowserWindow, remote } = require('electron')
const { queryExecution } = require('../js/connection')

const btnLogin = document.getElementById("btnLogin")
const username = document.getElementById("username")
const password = document.getElementById("password")

document.addEventListener("submit", (e) => {
    e.preventDefault()
    const queryUserAdmin = 'SELECT * FROM admin_user WHERE usuario = ' + '"' + username.value + '"'

    queryExecution(queryUserAdmin, (usuario) => {
        //console.log(usuario[0].usuario)
        if(Object.keys(usuario).length === 1) {
            
        }
    })
})