const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { shuffle } = require('./util');
import * as commands from './constants';

const app = express();

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

const users = {}
const connections = {}
let storyteller = false

// WebSocket server
wss.on('connection', ws => {
  console.log('New Connection opened')
  ws.send(JSON.stringify({
    command: 'newConnection'
  }))

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  ws.on('message', message => {
    console.log(`New message from ${ws.uuid}:\n    ${message}`)
    const data = JSON.parse(message) // {"command":"newUser","something":"Hi"}

    const command = data.command
    switch (command) {
      case 'newUser':
        newUser(data, ws)
        break;
      case 'rejoinLobby':
        rejoinLobby(data, ws)
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

// start our server
server.listen(process.env.PORT || 1337, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});

const newUser = (data, ws) => {
  const uuid = uuidv4();

  ws.uuid = uuid
  connections[uuid] = ws

  const user = {
    name: data.name
  }
  users[uuid] = user

  console.log('New user UUID:', uuid)

  // Respond to client
  ws.send(JSON.stringify({command:'joinLobby', uuid}))
  // Broadcast to all clients new user has joined
  broadcast(JSON.stringify({command:'userJoin', user}))
  // update all clients' gamestate
  broadcast(JSON.stringify({command:'usersUpdate', users}))
}

const rejoinLobby = (data, ws) => {
  const uuid = data.uuid
  if (connections[uuid]) {
    connections[uuid] = ws
    console.log('Reconnected:', users[uuid].name)
    // Respond to client
    ws.send(JSON.stringify({command:'joinLobby', uuid}))
    // Broadcast to all clients user has rejoined
    // broadcast(JSON.stringify({command:'userJoin', user}))
  } else {
    console.log('Attempt to join null game:', uuid)
    ws.send(JSON.stringify({command:'failed'}))
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

const noCommand = (data, ws) => {
  ws.send(`Command "${data.command}" not found`)
}

const broadcast = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}