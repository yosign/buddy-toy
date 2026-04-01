import React from 'react'
import { render } from 'ink'
import { App } from './App.js'
import { loadConfig } from './configStore.js'

loadConfig()
render(<App />)
