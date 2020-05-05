import React from 'react'
import styled from 'styled-components'

import logo from './assets/demon-head.png'

import { Gameboard } from './Gameboard'
import { NameInput } from './NameInput'
import { Storyteller } from './Storyteller'
import * as constants from './constants'

//Server Response Commands
const NEW_CONNECTION = 'newConnection'
const JOIN_LOBBY = 'joinLobby'
const FAILED = 'failed'
const USER_JOIN = 'userJoin'
const USERS_UPDATE = 'usersUpdate'

const AppContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
`

const Logo = styled.img`
  height: 200px;
  width: 200px;
`

class App extends React.Component {
  constructor(props) {
    super(props)

    this.websocket = null
    this.state = {
      openConnection: false,
      uuid: '',
    }
  }

  componentDidMount() {
    this.initWebSocket()
  }

  componentDidUpdate() {
    const { openConnection, inGame } = this.state

    // Open new connection check
    if (!openConnection) {
      this.initWebSocket()
    }

    // Rejoin game check
    const lsGameSession = JSON.parse(localStorage.getItem(constants.BOTC_GAME_SESSION))
    if (openConnection && !inGame && lsGameSession && lsGameSession.uuid) {
      this.doSend({ command: constants.NEW_USER, uuid: lsGameSession.uuid })
    }
  }

  initWebSocket = () => {
    this.websocket = new WebSocket(`ws://localhost:1337`)
    this.websocket.onopen = (evt) => this.onOpen(evt)
    this.websocket.onclose = (evt) => this.onClose(evt)
    this.websocket.onmessage = (evt) => this.onMessage(evt)
    this.websocket.onerror = (evt) => this.onError(evt)
  }

  onOpen = () => {
    console.log('Opening Connection...')
  }

  onClose = () => {
    console.log('Closing Connection...')
    this.setState({ openConnection: false, inGame: false })
  }

  onError = (evt) => {
    console.log(`Error on: ${evt.data}`)
  }

  doSend = (data) => {
    if (this.websocket) {
      this.websocket.send(JSON.stringify(data))
    }
  }

  onMessage = (event) => {
    const eventObj = JSON.parse(event.data)
    switch (eventObj.command) {
      case NEW_CONNECTION:
        this.setState({ uuid: eventObj.uuid, openConnection: true })
        break
      case JOIN_LOBBY:
        localStorage.setItem(constants.BOTC_GAME_SESSION, JSON.stringify(eventObj))
        this.setState({ inGame: true, storyteller: eventObj.storyteller })
        break
      case FAILED:
        localStorage.removeItem(constants.BOTC_GAME_SESSION)
        this.setState({ inGame: false })
        break
      case USERS_UPDATE:
        this.setState({ users: eventObj.users})
        break
      default:
        console.log(eventObj)
        break
    }
  }

  render() {
    const { openConnection, inGame } = this.state

    if (!openConnection) {
      return <div>Contacting server...</div>
    }

    if (inGame) {
      return (
        <AppContainer>
          <Gameboard users={this.state.users} websocket={this.websocket}/>
          {
            this.state.storyteller ? <Storyteller/> : null
          }
        </AppContainer>
      )
    }

    // const lsGameSession = localStorage.getItem(BOTC_GAME_SESSION)
    // if (lsGameSession && lsGameSession.uuid) {
    //   this.doSend({ command: REJOIN_LOBBY, uuid: lsGameSession.toJSON().uuid })
    //   return <div>OH! You're in a game. Please wait....</div>  
    // }

    return (
      <AppContainer>
        <h1>Blood on the Clocktower</h1>
        <Logo src={logo} alt={'big ugly face'} />
        <h2>Unofficial App</h2>
        <NameInput websocket={this.websocket} />
      </AppContainer>
    )
  }
}

export default App
