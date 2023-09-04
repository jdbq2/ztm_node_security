import fs from "fs";
import https from "https";
import express from "express";
import path from "path";
import helmet from "helmet";
import "dotenv/config";
import passport from "passport";
import { Strategy } from "passport-google-oauth20";
import { isAuthenticated } from "./middlewares/isAuthenticated";

// OBJETO CONFIGURACION CREDECIALES DEL GOOGLE
const config = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};

//OPCIONES DE CONFIGURACION DE LA ESTRATEGIA DE PASSPORT
const AUTH_OPTIONS = {
    callbackURL: "/auth/google/callback",
    clientID: config.CLIENT_ID!,
    clientSecret: config.CLIENT_SECRET!,
};

//FUNCION CALLBACK CUANDO PASSPORT HAGA EL LOGIN
function verifyCallback(
    accessToken: any,
    refreshToken: any,
    profile: any,
    done: any
) {
    console.log("Perfil de Google ===> " + JSON.stringify(profile));
    done(null, profile);
}

//INSTANCIAMOS EL SERVER Y CREAMOS LOS MIDDLEWARES
const app = express();
app.use(helmet()); // Headers de seguridad
app.use(passport.initialize()); //Passport
passport.use(new Strategy(AUTH_OPTIONS, verifyCallback)); //Estrategia utilizada por passport
app.use(express.static("public")); //servimos archivos estaticos de la carpeta public

//RUTAS
app.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["email"],
    })
);
app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/failure",
        successRedirect: "/",
        session: false,
    }),
    (req, res) => {
        console.log("Google called us back");
    }
);
app.get("/auth/logout", (req, res) => {});

app.get("/secret", isAuthenticated, (req, res) => {
    res.status(200).send("This is the secret!!!");
});

app.get("/failure", (req, res) => {
    res.status(500).json({
        error: "Server authentication error",
    });
});
//RUTA QUE SIRVE LOS ARCHIVOS HTML
app.get("/*", (req, res) => {
    res.status(200).sendFile(
        path.join(__dirname, "..", "/public", "/index.html")
    );
});

//SERVIDOR CON LA CONFIGURACION SLL CREADA CON OPENSSL DE FORMA LOCAL
https
    .createServer(
        {
            key: fs.readFileSync("key.pem"),
            cert: fs.readFileSync("cert.pem"),
        },
        app
    )
    .listen(8000, () => {
        console.log("Server Listening using HTTPS...");
    });
