import './style.css'
import { startApp } from './ui/screens'

const base = import.meta.env.BASE_URL
document.documentElement.style.setProperty('--bg-draft', `url("${base}bg/cathedral.jpg")`)
document.documentElement.style.setProperty('--bg-battle', `url("${base}bg/courtyard.jpg")`)

startApp()
