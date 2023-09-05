import fs from "fs";
import https from "https";
import express from "express";
import path from "path";
import helmet from "helmet";
import cookieSession from "cookie-session";
import passport, { Profile } from "passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { isAuthenticated } from "./middlewares/isAuthenticated";
import "dotenv/config";

// Objeto auxiliar de configuracion para el proceso de autenticacion
const config = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    COOKIE_KEY_1: process.env.COOKIE_KEY_1,
    COOKIE_KEY_2: process.env.COOKIE_KEY_2,
};

//Valores necesarios para el proceso de autenticacion
const AUTH_OPTIONS = {
    callbackURL: "/auth/google/callback",
    clientID: config.CLIENT_ID!,
    clientSecret: config.CLIENT_SECRET!,
};

//Funcion de verificacion que passport usa al momento de hacer la autenticacion
function verifyCallback(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
) {
    done(null, profile);
}

//Instanciamos el server y creamos los middlewares
const app = express();
// Headers de seguridad
app.use(helmet());
//Middleware para la creacion de la cookie
app.use(
    cookieSession({
        name: "session",
        maxAge: 25 * 60 * 60 * 1000,
        keys: [config.COOKIE_KEY_1!, config.COOKIE_KEY_2!],
    })
);
//Instanciamos Passport
app.use(passport.initialize());
//Crea la sesion y permite el llamado a las funciones de serializacion de la cookie
app.use(passport.session());
//Estrategia utilizada por passport
passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));

// Metodo para salvar la sesion en la cookie
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});
//Metodo para leer la sesion de la cookie
passport.deserializeUser((userId: any, done) => {
    done(null, userId);
});
//servimos archivos estaticos de la carpeta public
app.use(express.static("public"));

//Ruta para hacer la autenticacion por google con passport
app.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["email"],
    })
);
//Ruta con el callback del inicio de sesion por google usando Oauth20
app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/failure",
        successRedirect: "/",
        session: true,
    }),
    (req, res) => {
        console.log("Google called us back");
    }
);
app.get("/auth/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
    });
    return res.redirect("/");
});

//Ruta protegida solo para usuarios autenticados
app.get("/secret", isAuthenticated, (req, res) => {
    res.status(200).send("This is the secret!!!");
});

//Ruta a la que hacemos la redireccion si algo sale mal en el proceso de autenticacion
app.get("/failure", (req, res) => {
    res.status(500).json({
        error: "Server authentication error",
    });
});

//Ruta que sirve los archivos del cliente (HTML)
app.get("/*", (req, res) => {
    res.status(200).sendFile(
        path.join(__dirname, "..", "/public", "/index.html")
    );
});

//Servidor instanciado con la configuracion SSL de forma local
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
