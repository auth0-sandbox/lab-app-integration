// Acme: app.js
// Lab: Application Integration
//

import cookieParser from 'cookie-parser'
import express from 'express'
import session from 'express-session'
import createError from 'http-errors'
import logger from 'morgan'
import path, { dirname, normalize } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import auth0Express from 'express-openid-connect'

const { auth, requiresAuth } = auth0Express

dotenv.config()

// Calculate the app URL if not set externally
if (!process.env.BASE_URL) {
    process.env.BASE_URL = !process.env.CODESPACE_NAME
        ? `http://localhost:${process.env.PORT}`
        : `https://${process.env.CODESPACE_NAME}-${process.env.PORT}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
}

// Create Express
const app = express()

// Assuming this file is in the src directory, find the project directory
const __filename = fileURLToPath(import.meta.url)
const __fileDirectory = dirname(__filename)
const __dirname = normalize(path.join(__fileDirectory, ".."))
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "pug")

app.use(logger("combined"))

// Accept both JSON and URL-encoded bodies, and parse cookies
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// Serve the static files in the public directory
app.use(express.static(path.join(__dirname, "public")))

// Use sessions
app.use(
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: false,
            sameSite: 'lax',
            secure: false
        }
    })
)

app.use(
    auth({
        issuerBaseURL: process.env.ISSUER_BASE_URL,
        baseURL: process.env.BASE_URL,
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        secret: process.env.SECRET,
        idpLogout: true,
        authRequired: false,
        authorizationParams: {
            response_type: "code"
        }
    })
)

// Set up the middleware for the route paths

// Landing page - show totals if the user is authenticated
app.get("/", async (req, res) => {
    let locals = { user: req.oidc && req.oidc.user, total: null, count: null }
    if (locals.user) {
        locals.total = expenses.reduce((accum, expense) => accum + expense.value, 0)
        locals.count = expenses.length
    }
    res.render("home", locals)
})

// Show expenses, requires authentication
app.get("/expenses", requiresAuth(), async (req, res) => {
    res.render("expenses", {
        user: req.oidc && req.oidc.user,
        expenses,
    })
})

// Show tokens, requires authentication
app.get("/tokens", requiresAuth(), async (req, res) => {
    res.render("tokens", {
        user: req.oidc && req.oidc.user,
        id_token: req.oidc && req.oidc.idToken,
        access_token: req.oidc && req.oidc.accessToken,
        refresh_token: req.oidc && req.oidc.refreshToken,
    })
})

// Catch 404 and forward to error handler
app.use((req, res, next) => next(createError(404)))

// Error handler
app.use((err, req, res, next) => {
    res.locals.message = err.message
    res.locals.error = err
    res.status(err.status || 500)
    res.render("error", {
        user: req.oidc && req.oidc.user,
    })
})

app.listen(process.env.PORT, () => {
    console.log(`WEB APP: ${process.env.BASE_URL}`)
})

// Expenses
const expenses = [
    {
        date: new Date(),
        description: "Pizza for a Coding Dojo session.",
        value: 102,
    },
    {
        date: new Date(),
        description: "Coffee for a Coding Dojo session.",
        value: 42,
    }
]