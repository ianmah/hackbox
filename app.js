const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { shuffle } = require('./util')

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wsServer = new WebSocket.Server({ server });

const users = {}
const connections = {}
let storyteller = false

// WebSocket server
wsServer.on('connection', ws => {
  const uuid = uuidv4();
  ws.uuid = uuid
  connections[uuid] = ws
  console.log('New websocket connection', uuid)

  ws.send(JSON.stringify({
    command: 'newConnection'
  }))

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  ws.on('message', message => {
    console.log(`New message from ${ws.uuid}:\n${message}`)
    const data = JSON.parse(message) // {"command":"newUser","something":"Hi"}

    const command = data.command
    switch (command) {
      case 'newUser':
        newUser(data, ws)
        break;
      case 'assignStoryteller':
        assignStoryteller(ws.uuid)
        break;
      case 'assignRoles':
        assignRoles(data)
        break;
      default:
        noCommand(data, ws)
    }
  });

  ws.on('close', ws => {
    // close user connection
  });
});

//start our server
server.listen(process.env.PORT || 1337, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});

const newUser = (data, ws) => {
  if (connections[ws.uuid]) {
    users[ws.uuid] = {
      name: data.name
    }
    ws.send(JSON.stringify({command:'joinLobby', users}))
  }
  else {
    console.warn('No connection for that UUID found')
    ws.send(JSON.stringify({error:'No connection for that UUID found'}))
  }
}

const assignStoryteller = (uuid) => {
  if (!storyteller) {
    const user = users[uuid]
    user.storyteller = true
    storyteller = true
  }
}

const assignRoles = (data) => {
  const roles = shuffle(data.roles)
  Object.entries(users).forEach(entry => {
    const [ uuid, user ]= entry
    user.role = roles.pop()
    connections[uuid].send(JSON.stringify({command:'role', role: user.role}))
  })
  console.log(users)
}

const noCommand = ({command}, ws) => {
  ws.send(`Command "${command}" not found`)
}